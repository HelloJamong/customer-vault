import axios from 'axios';
import { API_BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';
import { queryClient } from '@/lib/queryClient';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 리다이렉트 중인지 확인하는 플래그
let isRedirecting = false;

// 동시에 여러 요청이 401을 받아도 refresh는 한 번만 수행한다.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return Promise.reject(new Error('No refresh token'));
    }
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        return data.accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// 요청 인터셉터: Access Token 자동 추가
// 오래 걸릴 수 있는 요청은 전역 10초 타임아웃에서 제외한다.
// (백업 실행, 파일 다운로드/업로드, PDF 조회 등 — 성공해도 10초를 넘기면
//  ECONNABORTED로 끊겨 "실패" 팝업이 뜨는 문제 방지)
const LONG_RUNNING_PATTERNS = [/\/backup\//, /\/documents\/.+\/(download|view)/, /\/template\/(upload|download)/];

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isBlob = config.responseType === 'blob';
    const isUpload = config.data instanceof FormData;
    const isLongPath = LONG_RUNNING_PATTERNS.some((re) => re.test(config.url || ''));
    if (isBlob || isUpload || isLongPath) {
      config.timeout = 120000;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 토큰 만료 시 자동 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 요청 설정 단계 실패·취소 등 config가 없는 경우는 원본 에러를 그대로 전달
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 로그인 요청인 경우 토큰 갱신 시도하지 않음
    if (originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    // 401 에러 && 재시도 아닌 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh Token도 만료된 경우 로그아웃
        // zustand store의 logout 호출
        useAuthStore.getState().logout();
        queryClient.clear(); // 이전 사용자 캐시 제거

        // 이미 로그인 페이지에 있지 않고, 리다이렉트 중이 아닌 경우에만 리다이렉트
        if (!isRedirecting && window.location.pathname !== '/login') {
          isRedirecting = true;
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

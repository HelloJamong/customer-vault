import axios from 'axios';
import { API_BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 리다이렉트 중인지 확인하는 플래그
let isRedirecting = false;

// 요청 인터셉터: Access Token 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    // 401 에러 && 재시도 아닌 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Refresh Token으로 새 Access Token 발급
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: refreshToken,
        });

        // 새 토큰 저장
        sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh Token도 만료된 경우 로그아웃
        // zustand store의 logout 호출
        useAuthStore.getState().logout();

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

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/axios';

const SESSION_CHECK_INTERVAL = 5000; // 5초마다 체크 (즉각적인 로그아웃을 위해)
const isDevelopment = import.meta.env.DEV;

export const useSessionValidator = () => {
  const { user } = useAuthStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isValidatingRef = useRef(false);

  useEffect(() => {
    // 로그인 상태가 아니면 체크하지 않음
    if (!user) {
      if (isDevelopment) console.log('[세션검증] 로그인 상태 아님 - 세션 검증 중지');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (isDevelopment) console.log('[세션검증] 세션 검증 시작 - 사용자:', user.username);

    // 세션 유효성 검증 함수
    const validateSession = async () => {
      // 이미 검증 중이거나 로그인 상태가 아니면 스킵
      if (isValidatingRef.current || !useAuthStore.getState().user) {
        if (isDevelopment) console.log('[세션검증] 스킵 - 검증 중이거나 로그인 상태 아님');
        return;
      }

      isValidatingRef.current = true;
      if (isDevelopment) console.log('[세션검증] 세션 유효성 검증 API 호출 중...');

      try {
        const response = await apiClient.get('/auth/validate-session');
        if (isDevelopment) console.log('[세션검증] 세션 유효함:', response.data);
      } catch (error: any) {
        if (isDevelopment) console.log('[세션검증] 에러 발생:', error.response?.status, error.message);

        // 세션이 만료되었거나 유효하지 않은 경우만 처리
        // (네트워크 오류 등은 무시)
        if (error.response?.status === 401) {
          if (isDevelopment) console.warn('[세션검증] 세션 만료! 강제 로그아웃 처리');

          // 인터벌 중지
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // 로컬 상태만 클리어 (백엔드 API 호출하지 않음)
          // 이미 다른 곳에서 로그인하여 세션이 삭제된 상태이므로
          // 백엔드에 로그아웃 요청을 보내면 안 됨
          useAuthStore.getState().logout();

          // 페이지 새로고침하여 로그인 페이지로 이동
          alert('다른 위치에서 로그인되어 현재 세션이 종료되었습니다.');
          window.location.href = '/login';
        }
      } finally {
        isValidatingRef.current = false;
      }
    };

    // 로그인 직후가 아닌 일정 시간 후부터 검증 시작 (5초 후)
    if (isDevelopment) console.log('[세션검증] 5초 후 첫 검증 예약, 이후 5초마다 검증');
    const initialTimeout = setTimeout(() => {
      validateSession();
    }, 5000);

    // 주기적으로 검증
    intervalRef.current = setInterval(validateSession, SESSION_CHECK_INTERVAL);

    // 클린업
    return () => {
      if (isDevelopment) console.log('[세션검증] 클린업 - 검증 중지');
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);
};

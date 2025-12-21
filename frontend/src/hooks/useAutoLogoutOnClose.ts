import { useEffect } from 'react';
import { ACCESS_TOKEN_KEY, API_BASE_URL } from '@/utils/constants';

/**
 * Sends a lightweight logout request when the tab/window is being closed
 * so that login/logout 로그에 "창 닫힘" 로그아웃이 남도록 한다.
 */
export const useAutoLogoutOnClose = () => {
  useEffect(() => {
    const sendLogout = () => {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;

      const payload = JSON.stringify({ accessToken: token, reason: 'WINDOW_CLOSE' });

      try {
        // 1) sendBeacon으로 신속히 로그아웃 기록
        const beaconSent = !!navigator.sendBeacon &&
          navigator.sendBeacon(
            `${API_BASE_URL}/auth/logout-beacon`,
            new Blob([payload], { type: 'application/json' })
          );

        // 2) sendBeacon을 지원하지 않거나 실패한 경우 keepalive fetch로 시도
        if (!beaconSent) {
          fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ reason: 'WINDOW_CLOSE' }),
            keepalive: true,
          }).catch(() => {
            // 로그 기록 실패는 무시 (탭 종료 시 네트워크 중단 가능)
          });
        }
      } catch {
        // 네트워크 전송이 실패해도 탭 종료를 막지 않음
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendLogout();
      }
    };

    window.addEventListener('pagehide', sendLogout);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', sendLogout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};

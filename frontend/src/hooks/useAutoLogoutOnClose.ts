import { useEffect } from 'react';
import { ACCESS_TOKEN_KEY, API_BASE_URL } from '@/utils/constants';

/**
 * Sends a lightweight logout request when the tab/window is being closed
 * so that login/logout 로그에 "창 닫힘" 로그아웃이 남도록 한다.
 */
export const useAutoLogoutOnClose = () => {
  useEffect(() => {
    let sent = false;

    const notifyClose = (event: PageTransitionEvent) => {
      // bfcache로 들어가는 경우(persisted)는 실제 종료가 아니므로 무시
      if (event.persisted) return;
      if (sent) return;
      sent = true;

      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;

      const payload = JSON.stringify({ accessToken: token, reason: 'WINDOW_CLOSE' });

      try {
        // 로그 기록 전용. 서버는 이 요청으로 세션을 삭제하지 않으므로
        // 새로고침이 발생해도 세션이 유지된다.
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            `${API_BASE_URL}/auth/logout-beacon`,
            new Blob([payload], { type: 'application/json' }),
          );
        } else {
          fetch(`${API_BASE_URL}/auth/logout-beacon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // 네트워크 전송 실패는 무시
      }
    };

    // pagehide만 사용 (beforeunload는 새로고침/앱 내 이동에서도 발생해 중복 전송됨)
    window.addEventListener('pagehide', notifyClose);
    return () => window.removeEventListener('pagehide', notifyClose);
  }, []);
};

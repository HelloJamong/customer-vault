import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ACCESS_TOKEN_KEY, API_BASE_URL } from '@/utils/constants';

const isDevelopment = import.meta.env.DEV;

// Access Token 만료(기본 1h) 전에 새 토큰으로 재연결
const PROACTIVE_RECONNECT_MS = 50 * 60 * 1000;
// 연결이 끊겼을 때 재시도 간격 (지수 백오프, 최대 30초)
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;

const log = (...args: unknown[]) => {
  if (isDevelopment) console.log('[SSE]', ...args);
};

/**
 * 서버가 보내는 세션 이벤트(다른 위치 로그인 → 강제 로그아웃)를 구독한다.
 * EventSource는 Authorization 헤더를 못 붙이므로 fetch 스트림으로 직접 읽는다.
 */
export const useSessionEvents = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const abortController = new AbortController();
    let proactiveTimer: number | undefined;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    let stopped = false;

    const scheduleRetry = () => {
      if (stopped || abortController.signal.aborted) return;
      const delay = Math.min(RETRY_BASE_MS * 2 ** retryAttempt, RETRY_MAX_MS);
      retryAttempt += 1;
      log(`재연결 예약 (${delay}ms 후)`);
      retryTimer = window.setTimeout(connect, delay);
    };

    const handleLogout = (message?: string) => {
      stopped = true;
      abortController.abort();
      useAuthStore.getState().logout();
      alert(message || '다른 위치에서 로그인되어 현재 세션이 종료되었습니다.');
      window.location.href = '/login';
    };

    async function connect() {
      if (stopped) return;
      window.clearTimeout(proactiveTimer);

      const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (!accessToken) {
        log('AccessToken 없음 - 재시도 예약');
        scheduleRetry();
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/session-events`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream',
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          log('연결 실패:', response.status);
          scheduleRetry();
          return;
        }

        retryAttempt = 0;
        log('연결 성공');

        // 토큰 만료 전 선제적 재연결
        proactiveTimer = window.setTimeout(() => {
          log('토큰 갱신용 재연결');
          connect();
        }, PROACTIVE_RECONNECT_MS);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 완성된 줄만 처리하고 나머지는 버퍼에 남긴다 (청크 경계 대응)
          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIdx).trimEnd();
            buffer = buffer.slice(newlineIdx + 1);
            if (!line.startsWith('data:')) continue;

            try {
              const event = JSON.parse(line.slice(5).trim());
              if (event.type === 'logout') {
                handleLogout(event.message);
                return;
              }
            } catch {
              // keepalive 등 JSON이 아닌 라인은 무시
            }
          }
        }

        // 서버가 스트림을 닫음 → 재연결
        if (!stopped) {
          log('스트림 종료 - 재연결');
          scheduleRetry();
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        log('연결 오류:', error);
        scheduleRetry();
      }
    }

    connect();

    return () => {
      stopped = true;
      abortController.abort();
      window.clearTimeout(proactiveTimer);
      window.clearTimeout(retryTimer);
    };
  }, [user]);
};

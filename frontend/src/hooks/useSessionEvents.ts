import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

export const useSessionEvents = () => {
  const { user } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    // 로그인 상태가 아니면 SSE 연결하지 않음
    if (!user) {
      console.log('[SSE] 로그인 상태 아님 - SSE 연결 중지');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (readerRef.current) {
        readerRef.current.cancel();
        readerRef.current = null;
      }
      return;
    }

    console.log('[SSE] SSE 연결 시작 - 사용자:', user.username);

    // SSE 연결 생성 (Authorization 헤더는 EventSource에서 직접 지원 안 됨)
    // Nginx 프록시를 통한 상대 경로 사용으로 CSP 우회
    const connectSSE = async () => {
      try {
        // 최신 AccessToken 가져오기 (재연결 시마다 갱신된 토큰 사용)
        const accessToken = sessionStorage.getItem('access_token');
        if (!accessToken) {
          console.log('[SSE] AccessToken 없음 - SSE 연결 불가');
          return;
        }

        const response = await fetch('/api/auth/session-events', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'text/event-stream',
          },
        });

        if (!response.ok) {
          console.error('[SSE] 연결 실패:', response.status);
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          console.error('[SSE] Reader 생성 실패');
          return;
        }

        // Reader 참조 저장 (재연결 시 취소하기 위해)
        readerRef.current = reader;

        console.log('[SSE] 연결 성공 - 이벤트 수신 대기 중');

        // 50분 후 재연결 타이머 설정 (Access Token 만료 10분 전)
        const RECONNECT_INTERVAL = 50 * 60 * 1000; // 50분
        reconnectTimerRef.current = window.setTimeout(() => {
          console.log('[SSE] 토큰 갱신을 위한 재연결 시작');

          // 기존 연결 종료
          if (readerRef.current) {
            readerRef.current.cancel();
            readerRef.current = null;
          }

          // 새 연결 시작
          connectSSE();
        }, RECONNECT_INTERVAL);

        console.log(`[SSE] 재연결 타이머 설정 완료 (${RECONNECT_INTERVAL / 60000}분 후)`);

        // 스트림 읽기
        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log('[SSE] 스트림 종료');
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6);

                  try {
                    const event = JSON.parse(data);
                    console.log('[SSE] 이벤트 수신:', event);

                    // 로그아웃 이벤트 처리
                    if (event.type === 'logout') {
                      console.warn('[SSE] 로그아웃 이벤트 - 즉시 로그아웃 처리');

                      // 로컬 상태만 클리어
                      useAuthStore.getState().logout();

                      // 페이지 새로고침하여 로그인 페이지로 이동
                      alert(event.message || '다른 위치에서 로그인되어 현재 세션이 종료되었습니다.');
                      window.location.href = '/login';

                      // 스트림 종료
                      reader.cancel();

                      // 재연결 타이머도 취소
                      if (reconnectTimerRef.current) {
                        clearTimeout(reconnectTimerRef.current);
                        reconnectTimerRef.current = null;
                      }

                      break;
                    }
                  } catch (e) {
                    // JSON 파싱 실패는 무시 (keepalive 등)
                  }
                }
              }
            }
          } catch (error) {
            console.error('[SSE] 스트림 읽기 오류:', error);
          }
        };

        readStream();

      } catch (error) {
        console.error('[SSE] 연결 오류:', error);
      }
    };

    connectSSE();

    // 클린업
    return () => {
      console.log('[SSE] 클린업 - SSE 연결 및 타이머 종료');

      // EventSource 종료
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Reader 취소
      if (readerRef.current) {
        readerRef.current.cancel();
        readerRef.current = null;
      }

      // 재연결 타이머 취소
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [user]);
};

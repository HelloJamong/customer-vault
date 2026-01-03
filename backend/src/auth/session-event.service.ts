import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SessionEvent {
  userId: number;
  sessionId: string;
  type: 'logout' | 'keepalive';
  message?: string;
}

@Injectable()
export class SessionEventService {
  // 사용자별 이벤트 스트림을 저장 (userId -> Subject)
  private eventStreams = new Map<number, Subject<SessionEvent>>();

  /**
   * 특정 사용자의 이벤트 스트림 가져오기 (없으면 생성)
   */
  getEventStream(userId: number): Subject<SessionEvent> {
    if (!this.eventStreams.has(userId)) {
      console.log(`[SSE] 사용자 ${userId}의 새 이벤트 스트림 생성`);
      this.eventStreams.set(userId, new Subject<SessionEvent>());
    }
    return this.eventStreams.get(userId);
  }

  /**
   * 특정 세션에 로그아웃 이벤트 전송
   */
  emitLogoutEvent(userId: number, sessionId: string, message?: string) {
    console.log(`[SSE] 로그아웃 이벤트 전송 - 사용자: ${userId}, 세션: ${sessionId}`);
    const stream = this.eventStreams.get(userId);
    if (stream) {
      stream.next({
        userId,
        sessionId,
        type: 'logout',
        message: message || '다른 위치에서 로그인되어 현재 세션이 종료되었습니다.',
      });
    } else {
      console.log(`[SSE] 사용자 ${userId}의 이벤트 스트림이 없음 (이미 종료됨)`);
    }
  }

  /**
   * 특정 사용자의 이벤트 스트림 제거
   */
  removeEventStream(userId: number) {
    const stream = this.eventStreams.get(userId);
    if (stream) {
      console.log(`[SSE] 사용자 ${userId}의 이벤트 스트림 종료`);
      stream.complete();
      this.eventStreams.delete(userId);
    }
  }

  /**
   * 연결된 클라이언트 수 반환
   */
  getActiveConnectionCount(): number {
    return this.eventStreams.size;
  }
}

import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// isFirstLogin(초기 비밀번호 미변경) 사용자가 비밀번호 변경 전에 호출할 수 있는 경로.
// 그 외 모든 API는 차단해, 강제 비밀번호 변경을 프론트엔드가 아니라 서버에서 보장한다.
const FIRST_LOGIN_ALLOWED_SUFFIXES = [
  '/auth/change-password',
  '/auth/me',
  '/auth/logout',
  '/auth/logout-beacon',
  '/auth/password-requirements',
  '/auth/validate-session',
  '/auth/session-events',
];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;

    const req = context.switchToHttp().getRequest();
    if (req.user?.isFirstLogin) {
      const path = (req.path || req.url || '').split('?')[0];
      const allowed = FIRST_LOGIN_ALLOWED_SUFFIXES.some((s) => path.endsWith(s));
      if (!allowed) {
        throw new ForbiddenException('초기 비밀번호를 변경해야 합니다.');
      }
    }
    return true;
  }
}

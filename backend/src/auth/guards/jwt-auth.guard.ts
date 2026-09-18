import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 초기 또는 만료된 비밀번호 사용자가 변경 전에 호출할 수 있는 경로.
// 그 외 모든 API는 차단해, 강제 비밀번호 변경을 프론트엔드가 아니라 서버에서 보장한다.
const PASSWORD_CHANGE_ALLOWED_SUFFIXES = [
  '/auth/change-password',
  '/auth/me',
  '/auth/logout',
  '/auth/logout-beacon',
  '/auth/password-requirements',
  '/auth/validate-session',
  '/auth/session-events',
  '/auth/session-policy',
  '/auth/extend-session',
];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;

    const req = context.switchToHttp().getRequest();
    if (req.user?.isFirstLogin || req.user?.passwordExpired) {
      const path = (req.path || req.url || '').split('?')[0];
      const allowed = PASSWORD_CHANGE_ALLOWED_SUFFIXES.some((s) => path.endsWith(s));
      if (!allowed) {
        throw new ForbiddenException({
          code: req.user.isFirstLogin ? 'PASSWORD_CHANGE_REQUIRED' : 'PASSWORD_EXPIRED',
          message: req.user.isFirstLogin
            ? '초기 비밀번호를 변경해야 합니다.'
            : '비밀번호 사용 기간이 만료되었습니다. 비밀번호를 변경해야 합니다.',
        });
      }
    }
    return true;
  }
}

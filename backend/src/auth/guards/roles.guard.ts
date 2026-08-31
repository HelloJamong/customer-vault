import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // @Roles가 없는 라우트는 (JwtAuthGuard만 통과하면) 허용
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      return false;
    }

    // DB/토큰과 enum 간 대소문자·공백 차이를 흡수
    const normalize = (role: any) => String(role ?? '').trim().toLowerCase();
    const normalizedUserRole = normalize(user.role);
    return requiredRoles.map(normalize).includes(normalizedUserRole);
  }
}

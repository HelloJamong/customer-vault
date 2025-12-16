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

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    console.log('[RolesGuard] User object from request:', JSON.stringify(user, null, 2));
    
    const userRole = user ? user.role : undefined;
    console.log(`[RolesGuard] User role: ${userRole}`);

    let hasPermission = false;
    if (Array.isArray(userRole)) {
      hasPermission = requiredRoles.some((role) => userRole.includes(role));
    } else {
      hasPermission = requiredRoles.some((role) => userRole === role);
    }

    console.log(`[RolesGuard] Permission check result: ${hasPermission}`);

    return hasPermission;
  }
}

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('[RolesGuard] ===== RolesGuard canActivate called =====');

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('[RolesGuard] Required roles from decorator:', requiredRoles);

    if (!requiredRoles) {
      console.log('[RolesGuard] No required roles, allowing access');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    console.log('[RolesGuard] User object from request:', JSON.stringify(user, null, 2));
    console.log('[RolesGuard] Full request path:', request.url);
    console.log('[RolesGuard] Request method:', request.method);

    if (!user || !user.role) {
      console.log('[RolesGuard] No user or role found - DENYING ACCESS');
      return false;
    }

    const userRole = user.role;

    // Normalize roles to avoid casing/whitespace mismatches between DB/token and enum
    const normalizeRole = (role: any) => String(role ?? '').trim().toLowerCase();
    const normalizedUserRole = normalizeRole(userRole);
    const normalizedRequiredRoles = requiredRoles.map(normalizeRole);

    console.log(`[RolesGuard] User role: "${userRole}" (normalized: "${normalizedUserRole}")`);
    console.log(`[RolesGuard] Required roles: [${requiredRoles.join(', ')}] (normalized: [${normalizedRequiredRoles.join(', ')}])`);

    const hasPermission = normalizedRequiredRoles.includes(normalizedUserRole);

    console.log(`[RolesGuard] Permission check result: ${hasPermission ? 'ALLOWED' : 'DENIED'}`);
    console.log('[RolesGuard] ===== RolesGuard canActivate finished =====');

    return hasPermission;
  }
}

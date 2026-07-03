import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { hasInheritedRole } from '../constants/role-hierarchy.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied. No user context.');
    }

    const userRole = user?.role;
    console.log('[RolesGuard] userRole=', userRole, 'required=', requiredRoles);
    if (
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.HEADMASTER ||
      String(userRole).toUpperCase() === 'ADMIN'
    ) {
      return true;
    }

    if (!hasInheritedRole(userRole, requiredRoles)) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}

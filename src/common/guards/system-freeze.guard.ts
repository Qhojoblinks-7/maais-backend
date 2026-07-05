import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemFreezeGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const user = request.user;

    // Skip guard for read operations and exempt paths
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const skipPaths = [
      '/api/v1/admin/settings/freeze',
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/api/v1/auth/me',
      '/api/v1/auth/logout',
      '/api/v1/grading/rules',
    ];

    const isExempt = skipPaths.some((path) => url.includes(path));
    if (isExempt) {
      return true;
    }

    // Only guard grade write operations
    const isGradeWrite = url.includes('/grading/');
    if (!isGradeWrite) {
      return true;
    }

    try {
      let settings = await this.prisma.adminSettings.findFirst();
      if (!settings) {
        settings = await this.prisma.adminSettings.create({ data: {} });
      }

      // Check admin override before auto-freeze check
      const adminOverrideWindow = 24 * 60 * 60 * 1000;
      const hasAdminOverride =
        settings.lastManualUnfreeze &&
        Date.now() - new Date(settings.lastManualUnfreeze).getTime() <
          adminOverrideWindow;

      let activeTerm = null;
      let isTermExpired = false;
      let departmentFrozen = false;
      let departmentFreezeReason: string | undefined;

      // Auto-freeze only if no admin override
      if (!settings.systemFrozen && !hasAdminOverride) {
        activeTerm = await this.prisma.term.findFirst({
          where: { isActive: true },
          select: { id: true, isLocked: true, endDate: true },
        });

        if (activeTerm && activeTerm.endDate < new Date()) {
          isTermExpired = true;
          settings = await this.prisma.adminSettings.update({
            where: { id: settings.id },
            data: {
              systemFrozen: true,
              systemFreezeReason:
                'Term ended — grade entry automatically frozen',
            },
          });
        }
      }

      if (!settings.systemFrozen && user?.staffProfile?.departmentId) {
        const department = await this.prisma.department.findUnique({
          where: { id: user.staffProfile.departmentId },
          select: { isFrozen: true, freezeReason: true, name: true },
        });

        if (department?.isFrozen) {
          departmentFrozen = true;
          departmentFreezeReason =
            department.freezeReason ||
            `Department "${department.name}" is frozen — grade entry suspended`;
        }
      }

      const isTermLocked = activeTerm?.isLocked ?? false;

      if (
        settings.systemFrozen ||
        isTermExpired ||
        isTermLocked ||
        departmentFrozen
      ) {
        const reason =
          departmentFreezeReason ||
          settings.systemFreezeReason ||
          (isTermLocked
            ? 'Term is locked — grade entry suspended'
            : 'Grade entry is suspended');
        throw new ForbiddenException({
          code: 'SYSTEM_FROZEN',
          message: 'Grade entry is suspended.',
          freezeReason: reason,
          timestamp: new Date().toISOString(),
        });
      }

      return true;
    } catch (error) {
      // On database error, allow request to proceed (fail open)
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error(
        '[SystemFreezeGuard] Database error, allowing request:',
        error,
      );
      return true;
    }
  }
}

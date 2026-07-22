import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async freezeDepartment(
    departmentId: string,
    reason?: string,
    performedById?: string,
  ) {
    const department = await this.prisma.department.findUniqueOrThrow({
      where: { id: departmentId },
    });

    const updated = await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        isFrozen: !department.isFrozen,
        freezeReason:
          reason ||
          (department.isFrozen ? undefined : 'Department frozen by admin'),
        frozenAt: department.isFrozen ? null : new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: performedById || '',
        action: 'UPDATE',
        entity: 'Department',
        entityId: departmentId,
        payload: {
          action: department.isFrozen ? 'UNFREEZE' : 'FREEZE',
          departmentName: department.name,
          departmentId,
          reason: updated.freezeReason,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: department.isFrozen
        ? `Department "${department.name}" has been unfrozen`
        : `Department "${department.name}" has been frozen`,
      department: {
        id: updated.id,
        name: updated.name,
        isFrozen: updated.isFrozen,
        freezeReason: updated.freezeReason,
        frozenAt: updated.frozenAt,
      },
    };
  }

  async transferTeacher(
    toDeptId: string,
    dto: { teacherId: string; fromDepartmentId: string },
    performedById?: string,
  ) {
    const fromDeptId = dto.fromDepartmentId;
    const teacherStaffId = dto.teacherId;

    const fromDept = await this.prisma.department.findUniqueOrThrow({
      where: { id: fromDeptId },
    });

    const toDept = await this.prisma.department.findUniqueOrThrow({
      where: { id: toDeptId },
    });

    const staff = await this.prisma.staffProfile.findUniqueOrThrow({
      where: { id: teacherStaffId },
      include: { user: true },
    });

    if (fromDeptId === toDeptId) {
      throw new ConflictException(
        'Source and destination departments are the same',
      );
    }

    await this.prisma.staffProfile.update({
      where: { id: teacherStaffId },
      data: { departmentId: toDeptId },
    });

    if (staff.user?.role === Role.HOD) {
      await this.prisma.user.update({
        where: { id: staff.userId },
        data: { role: Role.TEACHER },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId: performedById || '',
        action: 'UPDATE',
        entity: 'StaffProfile',
        entityId: teacherStaffId,
        payload: {
          action: 'TRANSFER',
          teacherName: `${staff.firstName} ${staff.lastName}`,
          teacherStaffId: staff.staffId,
          fromDepartmentId: fromDeptId,
          fromDepartmentName: fromDept.name,
          toDepartmentId: toDeptId,
          toDepartmentName: toDept.name,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: `Teacher ${staff.firstName} ${staff.lastName} transferred from ${fromDept.name} to ${toDept.name}`,
      transferredCount: 1,
      fromDepartment: fromDept.name,
      toDepartment: toDept.name,
    };
  }

  async authorizeTemplate(
    departmentId: string,
    template: string,
    performedById?: string,
  ) {
    const department = await this.prisma.department.findUniqueOrThrow({
      where: { id: departmentId },
    });

    return this.prisma.auditLog.create({
      data: {
        userId: performedById || '',
        action: 'UPDATE',
        entity: 'Department',
        entityId: departmentId,
        payload: {
          action: 'TEMPLATE_AUTHORIZED',
          departmentName: department.name,
          template,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async uploadStrategyPulse(departmentId?: string, performedById?: string) {
    const payload: any = {
      action: 'STRATEGY_PULSE_UPLOAD',
      timestamp: new Date().toISOString(),
    };

    if (departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: departmentId },
        select: { name: true },
      });
      payload.departmentId = departmentId;
      payload.departmentName = dept?.name || 'Unknown';
    }

    return this.prisma.auditLog.create({
      data: {
        userId: performedById || '',
        action: 'CREATE',
        entity: departmentId ? 'Department' : 'System',
        entityId: departmentId || 'global',
        payload,
      },
    });
  }

  async resetCredentials(
    staffId: string,
    temporaryPassword?: string,
    performedById?: string,
  ) {
    const staff = await this.prisma.staffProfile.findUniqueOrThrow({
      where: { id: staffId },
      include: { user: true },
    });

    if (!staff.user) {
      throw new NotFoundException('Staff user account not found');
    }

    // Guard against silent lockouts: never reset your own account, and never
    // reset a privileged (SUPER_ADMIN / HEADMASTER) account this way, since the
    // generated temporary password would otherwise lock the administrator out.
    if (performedById && staff.user.id === performedById) {
      throw new ForbiddenException(
        'You cannot reset your own credentials here. Use account settings to change your password.',
      );
    }

    if (
      staff.user.role === Role.SUPER_ADMIN ||
      staff.user.role === Role.HEADMASTER
    ) {
      throw new ForbiddenException(
        'Administrator credentials cannot be reset from the staff directory. Use a secure account-recovery flow instead.',
      );
    }

    const tempPassword = temporaryPassword || this.generateTemporaryPassword();
    const passwordHash = await argon2.hash(tempPassword);

    await this.prisma.user.update({
      where: { id: staff.user.id },
      data: { passwordHash, mustChangePassword: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: performedById || '',
        action: 'UPDATE',
        entity: 'User',
        entityId: staff.user.id,
        payload: {
          action: 'CREDENTIAL_RESET',
          staffId: staff.id,
          staffName: `${staff.firstName} ${staff.lastName}`,
          mustChangePassword: true,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: `Credential reset initiated for "${staff.firstName} ${staff.lastName}". Temporary access key generated.`,
      resetRecord: {
        staffId: staff.id,
        staffName: `${staff.firstName} ${staff.lastName}`,
        resetAt: new Date().toISOString(),
        resetBy: performedById || 'Admin',
        temporaryKey: tempPassword,
        status: 'completed',
      },
    };
  }

  async getAuditLogs(query: {
    entity?: string;
    entityId?: string;
    action?: string;
    userId?: string;
  }) {
    const where: any = {};

    if (query.entity) {
      where.entity = { contains: query.entity, mode: 'insensitive' };
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.user?.email || log.userId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        payload: log.payload,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      total,
    };
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async getSettings() {
    let settings = await this.prisma.adminSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.adminSettings.create({ data: {} });
    }
    return settings;
  }

  async updateMfa(enabled: boolean) {
    let settings = await this.prisma.adminSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.adminSettings.create({
        data: { mfaEnabled: enabled, maintenanceMode: false },
      });
    } else {
      settings = await this.prisma.adminSettings.update({
        where: { id: settings.id },
        data: { mfaEnabled: enabled },
      });
    }
    return settings;
  }

  async getSystemFreeze() {
    let settings = await this.prisma.adminSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.adminSettings.create({ data: {} });
    }
    return {
      systemFrozen: settings.systemFrozen,
      systemFreezeReason: settings.systemFreezeReason,
      lastManualUnfreeze: settings.lastManualUnfreeze,
      updatedAt: settings.updatedAt,
    };
  }

  async toggleSystemFreeze(enabled: boolean, reason?: string) {
    let settings = await this.prisma.adminSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.adminSettings.create({
        data: { systemFrozen: enabled, systemFreezeReason: reason },
      });
    } else {
      settings = await this.prisma.adminSettings.update({
        where: { id: settings.id },
        data: {
          systemFrozen: enabled,
          systemFreezeReason: reason,
          lastManualUnfreeze: enabled ? null : new Date(),
        },
      });
    }

    return {
      success: true,
      message: enabled
        ? 'Grade entry freeze activated'
        : 'Grade entry freeze lifted',
      systemFrozen: enabled,
      systemFreezeReason: reason,
    };
  }

  async toggleMaintenance(enabled: boolean) {
    let settings = await this.prisma.adminSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.adminSettings.create({
        data: { maintenanceMode: enabled, mfaEnabled: true },
      });
    } else {
      settings = await this.prisma.adminSettings.update({
        where: { id: settings.id },
        data: { maintenanceMode: enabled },
      });
    }
    return settings;
  }

  async updateCredentials(body: {
    currentPassword?: string;
    newPassword?: string;
  }) {
    if (!body.newPassword || body.newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    const adminUser = await this.prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    if (!adminUser) {
      throw new Error('No admin user found');
    }
    if (body.currentPassword) {
      const valid = await argon2.verify(
        adminUser.passwordHash,
        body.currentPassword,
      );
      if (!valid) {
        throw new Error('Current password is incorrect');
      }
    }
    const newHash = await argon2.hash(body.newPassword);
    await this.prisma.user.update({
      where: { id: adminUser.id },
      data: { passwordHash: newHash },
    });
    return { success: true, message: 'Credentials updated successfully' };
  }

  async assignHOD(
    deptId: string,
    staffId: string | null,
    performedById?: string,
  ) {
    const department = await this.prisma.department.findUniqueOrThrow({
      where: { id: deptId },
      include: { staff: { include: { user: true } } },
    });

    if (staffId) {
      const staff = department.staff.find((s) => s.id === staffId);
      if (!staff) {
        throw new NotFoundException('Staff not found in this department');
      }

      await this.prisma.user.updateMany({
        where: {
          role: Role.HOD,
          staffProfile: { departmentId: deptId },
        },
        data: { role: Role.TEACHER },
      });

      await this.prisma.user.update({
        where: { id: staff.userId },
        data: { role: Role.HOD },
      });

      const hodName = `${staff.firstName} ${staff.lastName}`;

      await this.prisma.auditLog.create({
        data: {
          userId: performedById || '',
          action: 'UPDATE',
          entity: 'Department',
          entityId: deptId,
          payload: {
            action: 'ASSIGN_HOD',
            departmentName: department.name,
            hodName,
            hodStaffId: staff.id,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: `${hodName} assigned as HOD of ${department.name}`,
        hodName,
        hodId: staff.id,
      };
    }

    await this.prisma.user.updateMany({
      where: {
        role: Role.HOD,
        staffProfile: { departmentId: deptId },
      },
      data: { role: Role.TEACHER },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: performedById || '',
        action: 'UPDATE',
        entity: 'Department',
        entityId: deptId,
        payload: {
          action: 'REVOKE_HOD',
          departmentName: department.name,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: `HOD authority revoked for ${department.name}`,
      hodName: 'Unassigned',
      hodId: null,
    };
  }

  async deleteDepartment(
    deptId: string,
    reason?: string,
    performedById?: string,
  ) {
    const department = await this.prisma.department.findUniqueOrThrow({
      where: { id: deptId },
      include: {
        _count: { select: { staff: true, subjects: true, students: true } },
      },
    });

    if (department._count.staff > 0 || department._count.students > 0) {
      throw new ConflictException(
        'Cannot delete department with assigned staff or students',
      );
    }

    await this.prisma.auditLog.create({
      data: {
        userId: performedById || '',
        action: 'DELETE',
        entity: 'Department',
        entityId: deptId,
        payload: {
          action: 'DELETE_DEPARTMENT',
          departmentName: department.name,
          reason: reason || 'Administrative deletion',
          timestamp: new Date().toISOString(),
        },
      },
    });

    await this.prisma.department.delete({ where: { id: deptId } });

    return {
      success: true,
      message: `Department ${department.name} deleted successfully`,
    };
  }
}

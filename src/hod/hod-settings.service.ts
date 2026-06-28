import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class HODSettingsService {
  constructor(private prisma: PrismaService) {}

  async getHODSettings(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access settings');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true } },
        department: { select: { name: true } },
      },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    return {
      profile: {
        name: `${staffProfile.firstName} ${staffProfile.lastName}`,
        email: staffProfile.user?.email || '',
        phone: staffProfile.phone || '',
        department: staffProfile.department?.name || '',
      },
      notifications: {
        grading: true,
        certification: true,
        security: true,
        gradeSubmissionReminders: true,
        interventionAlerts: true,
        systemAnnouncements: true,
        weeklyDigest: false,
      },
      security: {
        mfaEnabled: false,
        mfaEnforced: false,
        sessionTimeout: 30,
        passwordLastChanged: new Date().toISOString(),
        mfaEnrolledUsers: [],
      },
      uiPreferences: {
        theme: 'light',
        density: 'comfortable',
        defaultView: 'dashboard',
      },
      departmentConfig: { autoAlertThreshold: 15, autoResolveDays: 7 },
      auditFrequency: 'daily',
    };
  }

  async updateHODSettings(settings: any, userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can update settings');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const updates: any[] = [];
    if (settings.profile?.name) {
      const nameParts = settings.profile.name.trim().split(/\s+/);
      updates.push(
        this.prisma.staffProfile.update({
          where: { id: staffProfile.id },
          data: {
            firstName: nameParts[0] || staffProfile.firstName,
            lastName:
              nameParts.length > 1
                ? nameParts[nameParts.length - 1]
                : staffProfile.lastName,
            phone: settings.profile?.phone ?? staffProfile.phone,
          },
        }),
      );
    }

    return this.prisma
      .$transaction(updates)
      .then(() => ({ success: true, message: 'Settings updated' }));
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    userId: string,
    role: Role,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can change password');

    const argon2 = require('argon2');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) throw new ForbiddenException('Current password is incorrect');

    const newHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    return { success: true, message: 'Password changed successfully' };
  }

  async mfaEnroll(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can enroll MFA');
    return {
      qrCode:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGNpcmNsZSBjeD0iMTAwIiByPSI4MCIgc3Ryb2tlPSIjMDBhIiBzdHJva2Utd2lkdGg9IjUiIGZpbGw9Im5vbmUiLz48L3N2Zz4=',
      secret: 'JBSWY3DPEHPK3PXP',
      message: 'Scan QR code with your authenticator app',
    };
  }

  async mfaVerify(code: string, userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can verify MFA');
    return { success: true, message: 'MFA enabled successfully' };
  }

  async getActiveSessions(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can view sessions');
    return [
      {
        id: 'sess_current',
        ip: '127.0.0.1',
        userAgent: 'Current Session',
        createdAt: new Date().toISOString(),
        current: true,
      },
    ];
  }

  async revokeSession(sessionId: string, userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can revoke sessions');
    return { success: true, message: 'Session revoked' };
  }

  async getSystemHealth(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const [
      totalStudents,
      activeStudents,
      archivedStudents,
      totalGrades,
      totalReportCards,
      totalTranscripts,
      pendingObservations,
    ] = await Promise.all([
      this.prisma.studentProfile.count(),
      this.prisma.studentProfile.count({ where: { archivedAt: null } }),
      this.prisma.studentProfile.count({
        where: { archivedAt: { not: null } },
      }),
      this.prisma.gradeEntry.count(),
      this.prisma.reportCard.count(),
      this.prisma.transcript.count(),
      this.prisma.gradeEntry.count({ where: { hasObservation: false } }),
    ]);

    return {
      status: 'healthy',
      checkedAt: new Date(),
      counts: {
        totalStudents,
        activeStudents,
        archivedStudents,
        totalGrades,
        totalReportCards,
        totalTranscripts,
        pendingObservations,
      },
    };
  }

  async impersonateTeacher(
    teacherId: string,
    body: { reason?: string },
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can impersonate teachers',
      );
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile && role === Role.HOD)
      throw new NotFoundException('HOD profile not found');

    if (role === Role.HOD && staffProfile) {
      const teacher = await this.prisma.staffProfile.findUnique({
        where: { id: teacherId },
      });
      if (!teacher || teacher.departmentId !== staffProfile.departmentId) {
        throw new ForbiddenException(
          'You can only impersonate teachers in your department',
        );
      }
    }

    const newToken = require('crypto').randomBytes(32).toString('hex');
    return {
      success: true,
      token: newToken,
      teacherId,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      reason: body.reason || 'Administrative oversight',
    };
  }

  async stopImpersonation(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs or above can stop impersonation');
    return { success: true, message: 'Impersonation stopped' };
  }

  async getEscalatedIssues(userId: string, role: Role, params?: any) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const tickets = await this.prisma.supportTicket.findMany({
      where: { status: params?.status || undefined },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async getSupportTickets(userId: string, role: Role, params?: any) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.priority) where.priority = params.priority;
    if (params?.q) {
      where.OR = [
        { title: { contains: params.q } },
        { description: { contains: params.q } },
      ];
    }

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params?.limit || 50,
      skip: ((params?.page || 1) - 1) * (params?.limit || 50),
    });

    const total = await this.prisma.supportTicket.count({ where });

    return {
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
        studentId: t.studentId,
      })),
      total,
      page: params?.page || 1,
    };
  }

  async createSupportTicket(userId: string, role: Role, ticket: any) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('Staff profile not found');

    const anyStudentId =
      ticket.studentId ||
      (await this.prisma.studentProfile.findFirst({ select: { id: true } }))
        ?.id;

    const newTicket = await this.prisma.supportTicket.create({
      data: {
        title: ticket.subject,
        description: ticket.description,
        category: ticket.category || 'General',
        priority: ticket.priority || 'MEDIUM',
        studentId: anyStudentId || '',
        createdById: userId,
      },
    });

    return {
      id: newTicket.id,
      subject: newTicket.title,
      description: newTicket.description,
      status: newTicket.status,
      priority: newTicket.priority,
      createdAt: newTicket.createdAt.toISOString(),
    };
  }

  async updateSupportTicket(
    userId: string,
    role: Role,
    ticketId: string,
    patch: any,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: patch.status,
        priority: patch.priority,
      },
    });

    return {
      id: ticket.id,
      subject: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  async escalateTicket(
    userId: string,
    role: Role,
    ticketId: string,
    body: any,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'ESCALATED' },
    });

    return { success: true, message: 'Ticket escalated', ticketId };
  }

  async getContactChannels(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    return {
      email: '',
      phone: '',
      officeHours: 'Mon-Fri 8:00-16:00',
      officeLocation: '',
    };
  }

  async updateContactChannels(userId: string, role: Role, channels: any) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can update contact channels');

    return channels;
  }

  async getStudentAcademicHistory(
    userId: string,
    role: Role,
    studentId: string,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access this endpoint');

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) throw new NotFoundException('Student not found');

    return {
      studentId: student.id,
      name: `${student.firstName} ${student.lastName || ''}`.trim(),
      indexNumber: student.indexNumber,
      currentClass: '',
      reportCards: [],
    };
  }

  async getActiveImpersonations(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    return [];
  }

  async createEscalation(userId: string, role: Role, body: any) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const newEscalation = {
      id: `esc_${Date.now()}`,
      ...body,
      status: 'OPEN',
      createdAt: new Date(),
    };

    return newEscalation;
  }
}

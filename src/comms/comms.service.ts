import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationChannel, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';

export interface SendNotificationDto {
  studentIds?: string[];
  title: string;
  body: string;
  channel: NotificationChannel;
  isEmergency?: boolean;
}

@Injectable()
export class CommsService {
  private readonly logger = new Logger(CommsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async sendNotification(dto: SendNotificationDto, sentById: string) {
    const recipients = dto.studentIds ?? [];

    const students = await this.prisma.studentProfile.findMany({
      where: recipients.length > 0 ? { id: { in: recipients } } : {},
      include: {
        user: true,
        parentLinks: {
          include: { parent: { include: { user: true } } },
          where: { isPrimary: true },
        },
      },
    });

    const results = await Promise.allSettled(
      students.map(async (student) => {
        const notification = await this.prisma.notification.create({
          data: {
            studentId: student.id,
            title: dto.title,
            body: dto.body,
            channel: dto.channel,
            createdById: sentById,
          },
        });

        try {
          if (dto.channel === NotificationChannel.SMS) {
            await this.sendSms(
              student.user.phone ??
                student.parentLinks[0]?.parent?.user?.phone ??
                '',
              `${dto.title}\n\n${dto.body}`,
            );
          }
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { deliveredAt: new Date() },
          });
        } catch (err) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { failedAt: new Date(), errorMsg: err.message },
          });
        }

        return notification;
      }),
    );

    const delivered = results.filter((r) => r.status === 'fulfilled').length;
    return {
      sent: students.length,
      delivered,
      failed: students.length - delivered,
    };
  }

  private async sendSms(to: string, body: string) {
    if (!to) {
      this.logger.warn('SMS skipped: no phone number');
      return;
    }

    try {
      const client = twilio(
        this.config.get('TWILIO_ACCOUNT_SID'),
        this.config.get('TWILIO_AUTH_TOKEN'),
      );
      await client.messages.create({
        body,
        from: this.config.get('TWILIO_PHONE_NUMBER'),
        to,
      });
      this.logger.log(`SMS sent to ${to}`);
    } catch (err) {
      this.logger.error(`SMS failed: ${err.message}`);
      throw err;
    }
  }

  async broadcastEmergency(title: string, body: string, sentById: string) {
    return this.sendNotification(
      { title, body, channel: NotificationChannel.SMS, isEmergency: true },
      sentById,
    );
  }

  async getStudentNotifications(
    studentId: string,
    unreadOnly = false,
    requesterId?: string,
    requesterRole?: Role,
  ) {
    let targetStudentId = studentId;

    if (requesterRole === Role.STUDENT && requesterId) {
      const lookupStudent = await this.prisma.studentProfile.findUnique({
        where: { userId: requesterId },
        select: { id: true },
      });

      if (!lookupStudent) {
        throw new ForbiddenException('Student profile not found');
      }
      targetStudentId = lookupStudent.id;
    }

    return this.prisma.notification.findMany({
      where: { studentId: targetStudentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async createTicket(dto: CreateSupportTicketDto, requesterId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new ForbiddenException('Only students can create support tickets');
    }

    const student = user.studentProfile;

    return this.prisma.supportTicket.create({
      data: {
        studentId: student.id,
        title: dto.title,
        description: dto.description,
        category: dto.category || 'General',
        priority: dto.priority || 'MEDIUM',
        createdById: requesterId,
        status: 'OPEN',
      },
      include: {
        student: {
          include: {
            currentClass: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  async getStudentTickets(studentId: string) {
    return this.prisma.supportTicket.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listTickets(
    query: { status?: string; category?: string; priority?: string },
    requesterId: string,
    role: Role,
  ) {
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;

    if (role === Role.STUDENT) {
      const user = await this.prisma.user.findUnique({
        where: { id: requesterId },
        include: { studentProfile: true },
      });

      if (!user?.studentProfile) {
        throw new ForbiddenException(
          'Only students can view their own tickets',
        );
      }

      where.studentId = user.studentProfile.id;
    } else if (role === Role.TEACHER || role === Role.HOD) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { userId: requesterId },
      });

      if (!staffProfile) {
        throw new ForbiddenException('Staff profile not found');
      }

      const assignments = await this.prisma.teachingAssignment.findMany({
        where: { teacherId: staffProfile.id },
        select: { classSectionId: true },
      });

      const classSectionIds = assignments.map((a) => a.classSectionId);
      const students = await this.prisma.studentProfile.findMany({
        where: { currentClassId: { in: classSectionIds } },
        select: { id: true },
      });

      where.studentId = { in: students.map((s) => s.id) };
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        student: {
          include: {
            currentClass: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateTicketStatus(
    ticketId: string,
    dto: { status: string; notes?: string },
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.SUPER_ADMIN &&
      role !== Role.HEADMASTER &&
      role !== Role.HOD
    ) {
      throw new ForbiddenException(
        'Only administrators can update ticket status',
      );
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
        resolvedAt: dto.status === 'RESOLVED' ? new Date() : null,
        assignedTo: userId,
      },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  async addTicketReply(
    ticketId: string,
    dto: { message: string; priority?: string },
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.SUPER_ADMIN &&
      role !== Role.HEADMASTER &&
      role !== Role.HOD &&
      role !== Role.TEACHER
    ) {
      throw new ForbiddenException('Only staff can reply to tickets');
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        ...(dto.priority ? { priority: dto.priority } : {}),
      },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return {
      ...updatedTicket,
      reply: {
        message: dto.message,
        repliedBy: user?.email || userId,
        repliedAt: new Date(),
        responderRole: role,
      },
    };
  }

  async getAnalyticsPulse(academicYearId?: string, userId?: string) {
    const [enrollmentByClass, averageBySubject, attendanceSummary] =
      await Promise.all([
        this.prisma.classSection.findMany({
          include: { _count: { select: { students: true } } },
        }),
        this.prisma.gradeEntry.groupBy({
          by: ['subjectId'],
          _avg: { totalScore: true },
          _count: { id: true },
        }),
        this.prisma.attendanceRecord.aggregate({
          _avg: { daysPresent: true, totalDays: true },
        }),
      ]);

    let teacherAssignments: any[] = [];
    if (userId) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { userId },
      });

      if (staffProfile) {
        teacherAssignments = await this.prisma.teachingAssignment.findMany({
          where: { teacherId: staffProfile.id },
          include: { classSection: true, subject: true },
        });
      }
    }

    const teacherClassIds = teacherAssignments.map((a) => a.classSectionId);
    const teacherSubjectIds = teacherAssignments.map((a) => a.subjectId);

    const enrollment =
      userId && teacherClassIds.length > 0
        ? enrollmentByClass
            .filter((c) => teacherClassIds.includes(c.id))
            .map((c) => ({
              class: `${c.level} ${c.name}`,
              count: c._count.students,
              capacity: c.capacity,
            }))
        : enrollmentByClass.map((c) => ({
            class: `${c.level} ${c.name}`,
            count: c._count.students,
            capacity: c.capacity,
          }));

    const subjectPerformance =
      userId && teacherSubjectIds.length > 0
        ? averageBySubject
            .filter((s) => teacherSubjectIds.includes(s.subjectId))
            .map((s) => ({
              subjectId: s.subjectId,
              averageScore: s._avg.totalScore?.toFixed(2),
              studentCount: s._count.id,
            }))
        : averageBySubject.map((s) => ({
            subjectId: s.subjectId,
            averageScore: s._avg.totalScore?.toFixed(2),
            studentCount: s._count.id,
          }));

    return {
      enrollment,
      subjectPerformance,
      attendance: attendanceSummary._avg,
      teacherAssignments: userId
        ? teacherAssignments.map((a) => ({
            id: a.id,
            subjectId: a.subjectId,
            subjectName: a.subject.name,
            classSectionId: a.classSectionId,
            className: `${a.classSection.level} ${a.classSection.name}`,
          }))
        : undefined,
    };
  }
}

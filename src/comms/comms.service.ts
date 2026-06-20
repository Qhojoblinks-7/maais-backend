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

  async getUnreadForStaff(userId: string, role: Role) {
    this.logger.log(`getUnreadForStaff: userId=${userId}, role=${role}`);
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true, departmentId: true },
    });

    if (!staffProfile) {
      this.logger.warn(`No staff profile found for userId=${userId}`);
      return [];
    }

    this.logger.log(
      `Found staffProfile: id=${staffProfile.id}, departmentId=${staffProfile.departmentId}`,
    );

    const where: any = {
      staffId: staffProfile.id,
      isRead: false,
    };

    if (role === Role.TEACHER) {
      const hodUserIds = await this.getHODUserIdsForTeacher(staffProfile.id);
      this.logger.log(`HOD userIds for teacher: ${hodUserIds.join(', ')}`);
      where.OR = [
        { staffId: staffProfile.id },
        {
          createdById: {
            in: hodUserIds,
          },
          isRead: false,
        },
      ];
    }

    const results = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    this.logger.log(`Found ${results.length} unread notifications`);
    return results;
  }

  private async getHODUserIdsForTeacher(staffId: string) {
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: staffId },
      select: { subjectId: true },
    });

    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: assignments.map((a) => a.subjectId) } },
      select: { departmentId: true },
    });

    const departmentIds = [
      ...new Set(subjects.map((s) => s.departmentId).filter(Boolean)),
    ];

    const hodStaffIds = await this.prisma.staffProfile.findMany({
      where: {
        departmentId: { in: departmentIds },
        user: { role: Role.HOD },
      },
      select: { userId: true },
    });

    return hodStaffIds.map((s) => s.userId);
  }

  async sendHODAction(
    targetTeacherId: string,
    action: string,
    details: Record<string, any>,
    senderUserId: string,
  ) {
    const senderStaff = await this.prisma.staffProfile.findUnique({
      where: { userId: senderUserId },
    });

    const targetStaff = await this.prisma.staffProfile.findFirst({
      where: { OR: [{ id: targetTeacherId }, { staffId: targetTeacherId }] },
    });

    const title = this.getNotificationTitle(action);
    const body = this.getNotificationMessage(action, details);

    const notification = await this.prisma.notification.create({
      data: {
        staffId: targetStaff?.id,
        title,
        body,
        channel: NotificationChannel.APP,
        createdById: senderStaff?.userId || senderUserId,
      },
    });

    return notification;
  }

  async sendTeacherAction(
    recordId: string,
    action: string,
    message: string,
    className: string,
    senderUserId: string,
  ) {
    const senderStaff = await this.prisma.staffProfile.findUnique({
      where: { userId: senderUserId },
      select: { departmentId: true },
    });

    const teachers = await this.prisma.staffProfile.findMany({
      where: {
        departmentId: senderStaff?.departmentId,
        user: { role: Role.TEACHER },
      },
      select: { id: true },
    });

    const title = this.getNotificationTitleForHOD(action);
    const body = this.getNotificationMessageForHOD(action, {
      message,
      className,
    });

    const notifications = await Promise.all(
      teachers.map((teacher) =>
        this.prisma.notification.create({
          data: {
            staffId: teacher.id,
            title,
            body,
            channel: NotificationChannel.APP,
            createdById: senderUserId,
          },
        }),
      ),
    );

    return { sent: notifications.length };
  }

  private getNotificationTitle(action: string) {
    const titles = {
      GRADE_DRAFT_SAVED: 'Grade Draft Saved',
      GRADE_SUBMITTED_TO_HOD: 'Grade Submitted for Review',
      GRADE_REVISION_REQUESTED: 'Grade Revision Requested',
      HOD_COMMENT_ADDED: 'HOD Feedback Added',
      GRADE_REVISION_REJECTED: 'Grade Revision Rejected',
      DIRECT_MESSAGE: 'New Direct Message',
    };
    return titles[action] || 'Notification';
  }

  private getNotificationMessage(action: string, details: Record<string, any>) {
    const messages = {
      GRADE_DRAFT_SAVED: `A grade draft has been saved for ${details?.className || 'a class'}`,
      GRADE_SUBMITTED_TO_HOD: `Grades have been submitted for review for ${details?.className || 'a class'}`,
      GRADE_REVISION_REQUESTED: `A grade revision has been requested for ${details?.className || 'a class'}`,
      HOD_COMMENT_ADDED: `HOD feedback has been added: ${details?.message || ''}`,
      GRADE_REVISION_REJECTED: `Grade revision rejected: ${details?.reason || ''}`,
      DIRECT_MESSAGE: details?.message || 'You have a new direct message',
    };
    return messages[action] || 'You have a new notification';
  }

  private getNotificationTitleForHOD(action: string) {
    const titles = {
      GRADE_DRAFT_SAVED: 'Teacher Saved Grade Draft',
      GRADE_SUBMITTED_TO_HOD: 'Teacher Submitted Grades for Review',
      GRADE_REVISION_REQUESTED: 'Teacher Requested Grade Revision',
      DIRECT_MESSAGE: 'New Direct Message from Teacher',
    };
    return titles[action] || 'Notification';
  }

  private getNotificationMessageForHOD(
    action: string,
    details: Record<string, any>,
  ) {
    const messages = {
      GRADE_DRAFT_SAVED: `Teacher has saved a draft for ${details?.className || 'a class'}`,
      GRADE_SUBMITTED_TO_HOD: `Teacher has submitted grades for review for ${details?.className || 'a class'}`,
      GRADE_REVISION_REQUESTED: `Teacher has requested a grade revision for ${details?.className || 'a class'}`,
      DIRECT_MESSAGE:
        details?.message || 'You have received a direct message from a teacher',
    };
    return messages[action] || 'You have a new notification';
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

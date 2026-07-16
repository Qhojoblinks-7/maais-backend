import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationChannel, Role, AuditAction } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
import { CircuitBreakerService } from '../common/services/circuit-breaker.service';

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
    private circuitBreaker: CircuitBreakerService,
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

    if (students.length === 0) {
      return { sent: 0, delivered: 0, failed: 0, async: true };
    }

    // 1) Persist every notification in ONE query (was 1 create + 1 update per student).
    const notifications = await this.prisma.notification.createManyAndReturn({
      data: students.map((student) => ({
        studentId: student.id,
        title: dto.title,
        body: dto.body,
        channel: dto.channel,
        createdById: sentById,
      })),
    });

    const studentById = new Map(students.map((s) => [s.id, s]));

    // 2) Deliver (SMS) and update status in the BACKGROUND. The HTTP response
    //    returns immediately so the UI stays within the 2–5s budget even for
    //    large broadcasts; per-recipient delivery statuses update as they finish.
    void Promise.allSettled(
      notifications.map(async (notification) => {
        const student = studentById.get(notification.studentId);
        if (!student) return;

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
            data: { failedAt: new Date(), errorMsg: err?.message },
          });
        }
      }),
    ).catch(() => {});

    return {
      sent: students.length,
      delivered: students.length,
      failed: 0,
      async: true,
    };
  }

  private async sendSms(to: string, body: string) {
    if (!to) {
      this.logger.warn('SMS skipped: no phone number');
      return;
    }

    try {
      await this.circuitBreaker.execute(
        'twilio-sms',
        async () => {
          const client = twilio(
            this.config.get('TWILIO_ACCOUNT_SID'),
            this.config.get('TWILIO_AUTH_TOKEN'),
          );
          await client.messages.create({
            body,
            from: this.config.get('TWILIO_PHONE_NUMBER'),
            to,
          });
        },
        5,
        30_000,
      );
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

    // Only the student themselves may view their notification inbox
    if (requesterRole !== Role.STUDENT) {
      return [];
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
    } else if (role === Role.SUPER_ADMIN || role === Role.HEADMASTER) {
      where.OR = [{ staffId: { not: null } }, { staffId: null }];
    } else {
      where.staffId = staffProfile.id;
    }

    this.logger.log(`getUnreadForStaff query where: ${JSON.stringify(where)}`);

    const results = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    this.logger.log(
      `Found ${results.length} unread notifications for staffId=${staffProfile.id}`,
    );
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
      GRADE_REVISION_REQUESTED_BY_HOD: 'HOD Requested Grade Revision',
      GRADE_REVISION_APPROVED: 'Grade Revision Approved',
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
      GRADE_REVISION_REQUESTED_BY_HOD: `HOD has requested a revision for ${details?.className || 'a class'}`,
      GRADE_REVISION_APPROVED: `Your grade revision for ${details?.className || 'a class'} has been approved by HOD.`,
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
      GRADE_REVISION_REQUESTED_BY_HOD: 'HOD Requested Grade Revision',
      GRADE_REVISION_APPROVED: 'Grade Revision Approved',
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
      GRADE_REVISION_REQUESTED_BY_HOD: `HOD has requested a grade revision for ${details?.className || 'a class'}`,
      GRADE_REVISION_APPROVED: `Grade revision approved for ${details?.className || 'a class'}`,
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

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const isStudent = !!user.studentProfile;
    const studentId = isStudent ? user.studentProfile.id : null;

    return this.prisma.supportTicket.create({
      data: {
        studentId,
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
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true,
            staffProfile: { select: { firstName: true, lastName: true } },
            studentProfile: { select: { firstName: true, lastName: true } },
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

  async getTicketById(ticketId: string) {
    return this.prisma.supportTicket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        student: {
          include: {
            currentClass: true,
            user: { select: { email: true } },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true,
            staffProfile: { select: { firstName: true, lastName: true } },
            studentProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
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

      const studentIds = students.map((s) => s.id);
      where.OR = [
        { studentId: { in: studentIds } },
        { createdById: requesterId },
      ];
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
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true,
            staffProfile: { select: { firstName: true, lastName: true } },
            studentProfile: { select: { firstName: true, lastName: true } },
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

  async getAnalyticsPulse(
    academicYearId?: string,
    userId?: string,
    role?: Role,
    termId?: string,
    level?: string,
  ) {
    const termWhere: any = {};
    if (termId) termWhere.id = termId;
    if (academicYearId) termWhere.academicYearId = academicYearId;

    let termIds: string[] = [];
    if (Object.keys(termWhere).length > 0) {
      termIds = (
        await this.prisma.term.findMany({
          where: termWhere,
          select: { id: true },
        })
      ).map((t) => t.id);
    }

    const gradeWhere: any = {};
    if (termIds.length) gradeWhere.termId = { in: termIds };

    const attendanceWhere: any = {};
    if (termIds.length) attendanceWhere.termId = { in: termIds };

    const levelMap: Record<string, string> = {
      'SHS 1': 'FORM_1',
      'SHS 2': 'FORM_2',
      'SHS 3': 'FORM_3',
      'SHS 4': 'FORM_3',
    };
    const mappedLevel = level && level !== 'ALL' ? levelMap[level] : level;

    let levelSubjectIds: string[] = [];
    if (mappedLevel && mappedLevel !== 'ALL') {
      const classSections = await this.prisma.classSection.findMany({
        where: { level: mappedLevel as any },
        select: { id: true },
      });
      const classSectionIds = classSections.map((c) => c.id);
      levelSubjectIds = (
        await this.prisma.teachingAssignment.findMany({
          where: { classSectionId: { in: classSectionIds } },
          select: { subjectId: true },
        })
      ).map((a) => a.subjectId);
      const uniqueLevelSubjectIds = [...new Set(levelSubjectIds)];
      levelSubjectIds = uniqueLevelSubjectIds;
    }

    const [
      enrollmentByClass,
      averageBySubject,
      attendanceSummary,
      recentAuditLogs,
      recentTickets,
    ] = await Promise.all([
      this.prisma.classSection.findMany({
        include: { _count: { select: { students: true } } },
      }),
      this.prisma.gradeEntry.groupBy({
        by: ['subjectId'],
        where: gradeWhere,
        _avg: { totalScore: true },
        _count: { id: true },
      }),
      this.prisma.attendanceRecord.aggregate({
        where: attendanceWhere,
        _avg: { daysPresent: true, totalDays: true },
      }),
      this.prisma.auditLog.findMany({
        take: 7,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
        },
      }),
      this.prisma.supportTicket.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { include: { user: { select: { email: true } } } },
        },
      }),
    ]);

    // Enrich GradeEntry audit logs with the real student + subject names
    // so the feed shows human-readable data instead of raw UUIDs.
    const gradeEntryLogs = recentAuditLogs.filter(
      (l) => l.entity === 'GradeEntry' && l.entityId,
    );
    const gradeEntryMap = new Map<
      string,
      { studentName: string; subjectName: string }
    >();
    if (gradeEntryLogs.length) {
      const geIds = [...new Set(gradeEntryLogs.map((l) => l.entityId))];
      const gradeEntries = await this.prisma.gradeEntry.findMany({
        where: { id: { in: geIds } },
        include: {
          student: {
            select: { firstName: true, lastName: true, indexNumber: true },
          },
          subject: { select: { name: true } },
        },
      });
      for (const ge of gradeEntries) {
        const studentName = ge.student
          ? `${ge.student.firstName} ${ge.student.lastName}`.trim()
          : ge.student?.indexNumber || 'Unknown student';
        gradeEntryMap.set(ge.id, {
          studentName,
          subjectName: ge.subject?.name || 'Unknown subject',
        });
      }
    }

    let teacherAssignments: any[] = [];
    const isAdmin = role === Role.SUPER_ADMIN || role === Role.HEADMASTER;
    if (userId && !isAdmin) {
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

    const filteredEnrollment =
      mappedLevel && mappedLevel !== 'ALL'
        ? enrollmentByClass.filter((c) => c.level === (mappedLevel as any))
        : enrollmentByClass;

    const enrollment =
      userId && !isAdmin && teacherClassIds.length > 0
        ? filteredEnrollment
            .filter((c) => teacherClassIds.includes(c.id))
            .map((c) => ({
              class: `${c.level} ${c.name}`,
              count: c._count.students,
              capacity: c.capacity,
            }))
        : filteredEnrollment.map((c) => ({
            class: `${c.level} ${c.name}`,
            count: c._count.students,
            capacity: c.capacity,
          }));

    const filteredSubjectPerformance =
      mappedLevel && mappedLevel !== 'ALL'
        ? averageBySubject.filter((s) => levelSubjectIds.includes(s.subjectId))
        : averageBySubject;

    const subjectPerformance =
      userId && !isAdmin && teacherSubjectIds.length > 0
        ? filteredSubjectPerformance
            .filter((s) => teacherSubjectIds.includes(s.subjectId))
            .map((s) => ({
              subjectId: s.subjectId,
              averageScore: s._avg.totalScore?.toFixed(2),
              studentCount: s._count.id,
            }))
        : filteredSubjectPerformance.map((s) => ({
            subjectId: s.subjectId,
            averageScore: s._avg.totalScore?.toFixed(2),
            studentCount: s._count.id,
          }));

    const auditActivities = recentAuditLogs.map((log) => {
      const payload = log.payload as any;
      let event = '';
      let type: 'system' | 'academic' | 'security' | 'comm' = 'academic';

      if (payload) {
        if (payload.action === 'FREEZE') {
          event = `Frozen ${payload.departmentName || log.entity} department - ${payload.reason || 'No reason provided'}`;
          type = 'security';
        } else if (payload.action === 'TRANSFER') {
          event = `Transferred ${payload.teacherName} from ${payload.fromDepartmentName} to ${payload.toDepartmentName}`;
          type = 'system';
        } else if (payload.action === 'CREDENTIAL_RESET') {
          event = `Reset credentials for ${payload.staffName}`;
          type = 'system';
        } else if (payload.action === 'STRATEGY_PULSE_UPLOAD') {
          event = `Strategy pulse uploaded for ${payload.departmentName || 'global'}`;
          type = 'comm';
        } else if (log.action === AuditAction.GRADE_CORRECTION) {
          const indexOrId =
            payload?.indexNumber || payload?.studentIndex || log.entityId;
          const gradeInfo =
            payload?.oldGrade && payload?.newGrade
              ? ` (${payload.oldGrade} → ${payload.newGrade})`
              : '';
          event = `Corrected grade${gradeInfo} for ${indexOrId !== 'unknown' ? `index #${indexOrId}` : 'student'}`;
          type = 'academic';
        } else if (log.action === AuditAction.PROMOTE) {
          const fromClass = payload?.fromClass || 'current';
          const toClass = payload?.toClass || 'next level';
          event = `Promoted student from ${fromClass} to ${toClass}`;
          type = 'academic';
        }
      }

      if (!event) {
        if (
          log.entity === 'GradeEntry' &&
          log.entityId &&
          gradeEntryMap.has(log.entityId)
        ) {
          const g = gradeEntryMap.get(log.entityId)!;
          const verb =
            log.action === AuditAction.CREATE
              ? 'Created'
              : log.action === AuditAction.DELETE
                ? 'Deleted'
                : 'Updated';
          event = `${verb} ${g.studentName}'s ${g.subjectName} grade`;
          type =
            log.action === AuditAction.CREATE
              ? 'system'
              : log.action === AuditAction.DELETE
                ? 'security'
                : 'academic';
        } else {
          const entityInfo = log.entityId
            ? ` (${log.entityId.substring(0, 8)}...)`
            : '';
          event = `${log.action} on ${log.entity}${entityInfo}`;
          type =
            log.action === AuditAction.CREATE
              ? 'system'
              : log.action === AuditAction.UPDATE
                ? 'academic'
                : log.action === AuditAction.DELETE
                  ? 'security'
                  : 'comm';
        }
      }

      return {
        id: log.id,
        time: log.createdAt.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        event,
        type,
      };
    });

    const ticketActivities = recentTickets.map((ticket) => ({
      id: ticket.id,
      time: ticket.createdAt.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      event: `Support ticket: ${ticket.title || ticket.description?.substring(0, 50) || 'New ticket'} - ${ticket.status || 'OPEN'}`,
      type: 'comm' as const,
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
      recentActivity: [...auditActivities, ...ticketActivities].slice(0, 10),
    };
  }
}

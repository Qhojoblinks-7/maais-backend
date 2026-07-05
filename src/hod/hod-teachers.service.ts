import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, AuditAction } from '@prisma/client';

@Injectable()
export class HODTeacherService {
  constructor(private prisma: PrismaService) {}

  async getTeacherSubmissionStatus(
    userId: string,
    role: Role,
    academicYearId?: string,
    termNumber?: string,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    let targetTerm = null;
    if (academicYearId && termNumber) {
      targetTerm = await this.prisma.term.findFirst({
        where: {
          academicYearId,
          termNumber: termNumber as any,
        },
      });
    }
    if (!targetTerm) {
      targetTerm = await this.prisma.term.findFirst({
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
      });
    }

    const departmentTeachers = await this.prisma.staffProfile.findMany({
      where: {
        departmentId: staffProfile.departmentId,
        user: { role: Role.TEACHER },
      },
      include: { user: { select: { email: true } }, teachingAssignments: true },
    });

    const submissions = await Promise.all(
      departmentTeachers.map(async (teacher) => {
        const subjectIds = teacher.teachingAssignments.map((a) => a.subjectId);
        const classIds = teacher.teachingAssignments.map(
          (a) => a.classSectionId,
        );

        const studentCount =
          classIds.length > 0
            ? await this.prisma.studentProfile.count({
                where: { currentClassId: { in: classIds }, archivedAt: null },
              })
            : 0;

        const studentIds =
          classIds.length > 0
            ? await this.prisma.studentProfile.findMany({
                where: { currentClassId: { in: classIds }, archivedAt: null },
                select: { id: true },
              })
            : [];
        const studentIdList = studentIds.map((s) => s.id);

        const gradeCount =
          targetTerm && subjectIds.length > 0
            ? await this.prisma.gradeEntry.count({
                where: {
                  termId: targetTerm.id,
                  subjectId: { in: subjectIds },
                  totalScore: { not: null },
                },
              })
            : 0;

        const attendanceCount =
          targetTerm && studentIdList.length > 0
            ? await this.prisma.attendanceRecord.count({
                where: {
                  studentId: { in: studentIdList },
                  termId: targetTerm.id,
                },
              })
            : 0;

        const signedCount =
          targetTerm && subjectIds.length > 0
            ? await this.prisma.gradeEntry.count({
                where: {
                  termId: targetTerm.id,
                  subjectId: { in: subjectIds },
                  submittedById: { not: null },
                },
              })
            : 0;

        const observationCount =
          targetTerm && subjectIds.length > 0
            ? await this.prisma.gradeEntry.count({
                where: {
                  termId: targetTerm.id,
                  subjectId: { in: subjectIds },
                  hasObservation: true,
                },
              })
            : 0;

        const totalExpected = studentCount * subjectIds.length;
        const totalAttendance = studentCount * 60;
        const gradePct =
          totalExpected > 0
            ? Math.round((gradeCount / totalExpected) * 100)
            : 0;
        const attendancePct =
          totalAttendance > 0
            ? Math.round((attendanceCount / totalAttendance) * 100)
            : 0;
        const signOffPct =
          totalExpected > 0
            ? Math.round((signedCount / totalExpected) * 100)
            : 0;
        const observationPct =
          totalExpected > 0
            ? Math.round((observationCount / totalExpected) * 100)
            : 0;
        const progress = Math.min(
          gradePct,
          attendancePct,
          signOffPct,
          observationPct,
        );

        return {
          teacherId: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.user?.email || '',
          status:
            progress === 100
              ? 'SUBMITTED'
              : progress > 0
                ? 'IN_PROGRESS'
                : 'DRAFT',
          progress,
        };
      }),
    );

    return submissions;
  }

  async getDepartmentTeachers(
    userId: string,
    role: Role,
    params?: { search?: string },
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can view department teachers');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const whereClause: any = {
      departmentId: staffProfile.departmentId,
      user: { role: { in: [Role.TEACHER, Role.HOD] } },
    };

    if (params?.search) {
      const search = params.search.toLowerCase();
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const teachers = await this.prisma.staffProfile.findMany({
      where: whereClause,
      include: { user: { select: { email: true, isActive: true } } },
      orderBy: { lastName: 'asc' },
    });

    return teachers.map((teacher) => ({
      id: teacher.id,
      userId: teacher.userId,
      name: `${teacher.firstName} ${teacher.lastName}`,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.user?.email || '',
      phone: teacher.phone || '',
      active: teacher.user?.isActive ?? false,
      subjects: [],
      classes: [],
      rating: '4.8',
      status: teacher.user?.isActive ? 'ACTIVE' : 'INACTIVE',
    }));
  }

  async resetTeacherPassword(
    teacherId: string,
    newPassword: string,
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can reset teacher passwords',
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
          'You can only reset passwords for teachers in your department',
        );
      }
    }

    const passwordHash = await this.hashPassword(newPassword);
    return this.prisma.user.updateMany({
      where: { staffProfile: { id: teacherId } },
      data: { passwordHash },
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const argon2 = require('argon2');
    return argon2.hash(password);
  }

  async getAuditLogs(userId: string, role: Role, params?: any) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const departmentUserIds = await this.prisma.user
      .findMany({
        where: {
          staffProfile: { departmentId: staffProfile.departmentId },
        },
        select: { id: true },
      })
      .then((u) => u.map((x) => x.id));

    const results: any[] = [];

    // ── AuditLog entries ─────────────────────────────────────────────────────
    const auditWhere: any = { userId: { in: departmentUserIds } };
    if (params?.startDate)
      auditWhere.createdAt = {
        ...auditWhere.createdAt,
        gte: new Date(params.startDate),
      };
    if (params?.endDate)
      auditWhere.createdAt = {
        ...auditWhere.createdAt,
        lte: new Date(params.endDate),
      };
    if (params?.teacherId) auditWhere.userId = params.teacherId;
    if (params?.action) auditWhere.action = params.action;

    const auditLogs = await this.prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            staffProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      take: 200,
    });

    for (const log of auditLogs) {
      const payload = (log.payload as any) || {};
      const profiler = log.user?.staffProfile;
      let derivedStatus = 'PENDING';
      if (log.action === 'LOCK') derivedStatus = 'LOCKED';
      else if (log.action === 'UNLOCK') derivedStatus = 'UNLOCKED';
      else if (log.action === 'GRADE_CORRECTION') derivedStatus = 'FLAGGED';
      else if (log.action === 'DELETE') derivedStatus = 'RESOLVED';
      else if (log.action === 'CREATE') derivedStatus = 'DRAFT';

      results.push({
        id: log.id,
        recordId: log.entityId,
        teacherName: profiler
          ? `${profiler.firstName} ${profiler.lastName}`
          : 'Unknown',
        action: log.action,
        fieldChanged: payload.fieldChanged || null,
        oldValue: payload.oldValue ?? null,
        newValue: payload.newValue ?? null,
        justification: payload.justification || null,
        time: log.createdAt.toISOString(),
        timestamp: log.createdAt,
        status: derivedStatus,
        severity: 'MEDIUM',
        className: payload.className || null,
        subject: payload.subject || null,
        target: payload.target || 'System',
        entityType: log.entity,
      });
    }

    // ── GradeCorrection entries ──────────────────────────────────────────────
    const departmentSubjectIds = await this.prisma.subject
      .findMany({
        where: { departmentId: staffProfile.departmentId },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    const correctionWhere: any = {
      gradeEntry: { subjectId: { in: departmentSubjectIds } },
    };
    if (params?.startDate)
      correctionWhere.createdAt = {
        ...correctionWhere.createdAt,
        gte: new Date(params.startDate),
      };
    if (params?.endDate)
      correctionWhere.createdAt = {
        ...correctionWhere.createdAt,
        lte: new Date(params.endDate),
      };
    if (params?.teacherId) correctionWhere.changedById = params.teacherId;
    if (params?.studentId)
      correctionWhere.gradeEntry = {
        ...correctionWhere.gradeEntry,
        studentId: params.studentId,
      };

    const corrections = await this.prisma.gradeCorrection.findMany({
      where: correctionWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        gradeEntry: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                indexNumber: true,
                currentClass: { select: { name: true } },
              },
            },
            subject: { select: { name: true } },
          },
        },
      },
    });

    const userIds = corrections.map((c) => c.changedById);
    const userMap = await this.prisma.user
      .findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          staffProfile: { select: { firstName: true, lastName: true } },
        },
      })
      .then((users) => new Map(users.map((u) => [u.id, u.staffProfile])));

    for (const c of corrections) {
      const profiler = userMap.get(c.changedById);
      results.push({
        id: c.id,
        recordId: c.gradeEntryId,
        studentId: c.gradeEntry?.studentId,
        teacherName: profiler
          ? `${profiler.firstName} ${profiler.lastName}`
          : 'Unknown',
        action: 'GRADE_CORRECTION',
        fieldChanged: c.fieldChanged,
        oldValue: c.oldValue,
        newValue: c.newValue,
        justification: c.reason,
        time: c.createdAt.toISOString(),
        timestamp: c.createdAt,
        status: c.gradeEntry?.isApproved ? 'RESOLVED' : 'PENDING',
        severity: 'MEDIUM',
        className: c.gradeEntry?.student?.currentClass?.name,
        subject: c.gradeEntry?.subject?.name,
        target: c.gradeEntry?.student
          ? `${c.gradeEntry.student.firstName} ${c.gradeEntry.student.lastName} (${c.gradeEntry.student.indexNumber})`
          : 'Unknown',
        entityType: 'grade_revision',
      });
    }

    results.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return results;
  }

  async createAuditLog(
    userId: string,
    role: Role,
    data: {
      action?: string;
      entity: string;
      entityId: string;
      oldValue?: any;
      newValue?: any;
      justification?: string;
      metadata?: any;
    },
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const allowedActions = [
      'LOCK',
      'UNLOCK',
      'GRADE_CORRECTION',
      'UPDATE',
      'CREATE',
      'DELETE',
      'PROMOTE',
    ];
    let action = data.action;

    if (!action) {
      if (data.entity === 'class_term') {
        const oldStatus = data.oldValue?.status;
        const newStatus = data.newValue?.status;
        if (oldStatus === 'PENDING' && newStatus === 'LOCKED') action = 'LOCK';
        else if (oldStatus === 'LOCKED' && newStatus === 'PENDING')
          action = 'UNLOCK';
        else action = 'UPDATE';
      } else if (data.entity === 'grade_revision') {
        action = 'GRADE_CORRECTION';
      } else {
        action = 'UPDATE';
      }
    }

    if (!allowedActions.includes(action)) {
      throw new ForbiddenException('Invalid audit action for HOD');
    }

    const payload: any = {
      justification: data.justification || null,
      hodCommentedAt: null,
      hodCommenterId: null,
      ...(data.metadata || {}),
    };
    if (data.oldValue !== undefined) payload.oldValue = data.oldValue;
    if (data.newValue !== undefined) payload.newValue = data.newValue;

    const log = await this.prisma.auditLog.create({
      data: {
        userId,
        action: action as any,
        entity: data.entity,
        entityId: data.entityId,
        payload,
      },
    });

    return {
      id: log.id,
      recordId: log.entityId,
      teacherName: `${staffProfile.firstName} ${staffProfile.lastName}`,
      action: log.action,
      fieldChanged: payload.fieldChanged || null,
      oldValue: payload.oldValue ?? null,
      newValue: payload.newValue ?? null,
      justification: payload.justification || null,
      time: log.createdAt.toISOString(),
      timestamp: log.createdAt,
      status:
        action === 'LOCK'
          ? 'LOCKED'
          : action === 'UNLOCK'
            ? 'UNLOCKED'
            : action === 'GRADE_CORRECTION'
              ? 'FLAGGED'
              : 'PENDING',
      severity: 'MEDIUM',
      className: payload.className || null,
      subject: payload.subject || null,
      target: payload.target || 'System',
      entityType: log.entity,
    };
  }

  async addAuditLogComment(
    userId: string,
    role: Role,
    logId: string,
    comment: string,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const existing = await this.prisma.auditLog.findUnique({
      where: { id: logId },
      select: { id: true, payload: true },
    });

    if (!existing) throw new NotFoundException('Audit log not found');

    const newLog = await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE,
        entity: 'AuditLogComment',
        entityId: logId,
        payload: {
          comment,
          commentedAt: new Date().toISOString(),
          commenterId: userId,
          originalLogId: logId,
          originalPayload: existing.payload,
        },
      },
    });

    return {
      id: newLog.id,
      hodComment: (newLog.payload as any)?.comment || null,
    };
  }

  async getTeacherSubmissionTrends(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException(
        'Only HODs can view teacher submission trends',
      );

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const departmentId = staffProfile.departmentId;

    const targetTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      include: { academicYear: true },
    });

    if (!targetTerm) return [];

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId },
      select: { id: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subjectId: { in: subjectIds } },
      include: { classSection: true },
    });
    const classSectionIds = [
      ...new Set(teachingAssignments.map((ta) => ta.classSectionId)),
    ];

    const studentCount = await this.prisma.studentProfile.count({
      where: {
        currentClassId: { in: classSectionIds },
        archivedAt: null,
      },
    });
    const totalExpected = studentCount * subjectIds.length;

    const gradeEntries = await this.prisma.gradeEntry.findMany({
      where: {
        term: { academicYearId: targetTerm.academicYearId },
        subjectId: { in: subjectIds },
      },
      select: { createdAt: true },
    });

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const ay = targetTerm.academicYear;
    const ayStart = new Date(ay.startDate);
    const ayEnd = new Date(ay.endDate);

    const monthMap = new Map<string, number>();
    for (const ge of gradeEntries) {
      const created = new Date(ge.createdAt);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }

    const monthsDiff =
      (ayEnd.getFullYear() - ayStart.getFullYear()) * 12 +
      (ayEnd.getMonth() - ayStart.getMonth()) +
      1;
    const monthlyExpected = Math.max(1, Math.ceil(totalExpected / monthsDiff));

    const trends = [];
    const current = new Date(ayStart.getFullYear(), ayStart.getMonth(), 1);
    const end = new Date(ayEnd.getFullYear(), ayEnd.getMonth(), 1);

    while (current <= end) {
      const m = current.getMonth();
      const y = current.getFullYear();
      const key = `${y}-${m}`;
      const actual = monthMap.get(key) || 0;

      trends.push({
        name: monthNames[m],
        expected: monthlyExpected,
        actual,
      });

      current.setMonth(current.getMonth() + 1);
    }

    return trends;
  }
}

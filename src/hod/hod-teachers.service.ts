import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, AuditAction } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { OCCService } from '../common/services/occ.service';

@Injectable()
export class HODTeacherService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private occService: OCCService,
  ) {}

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

    const cacheKey = this.getCacheKey('getTeacherSubmissionStatus', {
      userId,
      role,
      academicYearId: academicYearId ?? '',
      termNumber: termNumber ?? '',
    });
    const cached = await this.cacheService.getCachedAggregate<
      Awaited<ReturnType<HODTeacherService['getTeacherSubmissionStatus']>>
    >('hod:teacher-status', cacheKey);
    if (cached) return cached;

    // departmentTeachers + term lookup are independent → run in parallel.
    const [departmentTeachers, targetTerm] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where: {
          departmentId: staffProfile.departmentId,
          user: { role: Role.TEACHER },
        },
        include: { user: { select: { email: true } }, teachingAssignments: true },
      }),
      (async () => {
        let term = null;
        if (academicYearId && termNumber) {
          term = await this.prisma.term.findFirst({
            where: { academicYearId, termNumber: termNumber as any },
          });
        }
        if (!term) {
          term = await this.prisma.term.findFirst({
            where: { isActive: true },
            orderBy: { startDate: 'desc' },
          });
        }
        return term;
      })(),
    ]);

    // ── Batched queries (was ~5 queries *per teacher*) ──────────────────
    const allClassIds = Array.from(
      new Set(
        departmentTeachers.flatMap((t) =>
          t.teachingAssignments.map((a) => a.classSectionId),
        ),
      ),
    );
    const allSubjectIds = Array.from(
      new Set(
        departmentTeachers.flatMap((t) =>
          t.teachingAssignments.map((a) => a.subjectId),
        ),
      ),
    );

    const studentsRaw =
      allClassIds.length > 0
        ? await this.prisma.studentProfile.findMany({
            where: { currentClassId: { in: allClassIds }, archivedAt: null },
            select: { id: true, currentClassId: true },
          })
        : [];
    const allStudentIds = studentsRaw.map((s) => s.id);

    // studentCountRows, gradeEntries and attRows are independent of each other
    // (attRows reuses the already-fetched student id list) → run concurrently.
    const [studentCountRows, gradeEntries, attRows] = await Promise.all([
      allClassIds.length > 0
        ? this.prisma.studentProfile.groupBy({
            by: ['currentClassId'],
            where: { currentClassId: { in: allClassIds }, archivedAt: null },
            _count: { _all: true },
          })
        : Promise.resolve([] as any[]),
      targetTerm && allSubjectIds.length > 0
        ? this.prisma.gradeEntry.findMany({
            where: { termId: targetTerm.id, subjectId: { in: allSubjectIds } },
            select: {
              subjectId: true,
              totalScore: true,
              submittedById: true,
              hasObservation: true,
            },
          })
        : Promise.resolve([] as any[]),
      targetTerm && allStudentIds.length > 0
        ? this.prisma.attendanceRecord.groupBy({
            by: ['studentId'],
            where: { studentId: { in: allStudentIds }, termId: targetTerm.id },
            _count: { _all: true },
          })
        : Promise.resolve([] as any[]),
    ]);

    const studentCountByClass = new Map<string, number>();
    for (const r of studentCountRows) {
      if (r.currentClassId)
        studentCountByClass.set(r.currentClassId, r._count._all);
    }

    const studentIdsByClass = new Map<string, string[]>();
    for (const s of studentsRaw) {
      if (!s.currentClassId) continue;
      const arr = studentIdsByClass.get(s.currentClassId) ?? [];
      arr.push(s.id);
      studentIdsByClass.set(s.currentClassId, arr);
    }

    const gradeAggBySubject = new Map<
      string,
      { total: number; signed: number; obs: number }
    >();
    for (const g of gradeEntries) {
      const cur =
        gradeAggBySubject.get(g.subjectId) ??
        { total: 0, signed: 0, obs: 0 };
      if (g.totalScore !== null) cur.total += 1;
      if (g.submittedById !== null) cur.signed += 1;
      if (g.hasObservation) cur.obs += 1;
      gradeAggBySubject.set(g.subjectId, cur);
    }

    const attCountByStudent = new Map<string, number>();
    for (const r of attRows) {
      attCountByStudent.set(r.studentId, r._count._all);
    }

    const submissions = departmentTeachers.map((teacher) => {
      const subjectIds = teacher.teachingAssignments.map((a) => a.subjectId);
      const classIds = teacher.teachingAssignments.map(
        (a) => a.classSectionId,
      );

      const studentIds = classIds.flatMap(
        (c) => studentIdsByClass.get(c) ?? [],
      );
      const studentCount = classIds.reduce(
        (sum, c) => sum + (studentCountByClass.get(c) ?? 0),
        0,
      );

      let gradeCount = 0;
      let signedCount = 0;
      let observationCount = 0;
      for (const sid of subjectIds) {
        const agg = gradeAggBySubject.get(sid);
        if (agg) {
          gradeCount += agg.total;
          signedCount += agg.signed;
          observationCount += agg.obs;
        }
      }

      let attendanceCount = 0;
      for (const sid of studentIds) {
        attendanceCount += attCountByStudent.get(sid) ?? 0;
      }

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
    });

    const result = submissions;

    await this.cacheService.setCachedAggregate(
      'hod:teacher-status',
      cacheKey,
      result,
      300,
    );

    return result;
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

    const cacheKey = this.getCacheKey('getDepartmentTeachers', {
      userId,
      role,
      search: params?.search ?? '',
    });
    const cached = await this.cacheService.getCachedAggregate<
      Awaited<ReturnType<HODTeacherService['getDepartmentTeachers']>>
    >('hod:dept-teachers', cacheKey);
    if (cached) return cached;

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

    // teachers + activeTerm are independent → run in parallel.
    const [teachers, activeTerm] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where: whereClause,
        include: {
          user: { select: { email: true, isActive: true } },
          teachingAssignments: {
            include: {
              subject: { select: { name: true } },
              classSection: { select: { name: true, level: true } },
            },
          },
        },
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.term.findFirst({
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    // Collect all subject/class pairs once, then a single grade query.
    const allSubjectIds = Array.from(
      new Set(
        teachers.flatMap((t) =>
          t.teachingAssignments.map((a) => a.subjectId),
        ),
      ),
    );
    const allClassSectionIds = Array.from(
      new Set(
        teachers.flatMap((t) =>
          t.teachingAssignments.map((a) => a.classSectionId),
        ),
      ),
    );

    const gradesRaw =
      activeTerm && allSubjectIds.length > 0 && allClassSectionIds.length > 0
        ? await this.prisma.gradeEntry.findMany({
            where: {
              termId: activeTerm.id,
              subjectId: { in: allSubjectIds },
              student: { currentClassId: { in: allClassSectionIds } },
            },
            select: {
              subjectId: true,
              totalScore: true,
              student: { select: { currentClassId: true } },
            },
          })
        : [];
    const scoresByPair = new Map<string, number[]>();
    for (const g of gradesRaw) {
      if (g.student?.currentClassId == null) continue;
      const key = `${g.subjectId}:${g.student.currentClassId}`;
      const arr = scoresByPair.get(key) ?? [];
      if (typeof g.totalScore === 'number') arr.push(g.totalScore);
      scoresByPair.set(key, arr);
    }

    const result = teachers.map((teacher) => {
      const subjects = Array.from(
        new Map(
          teacher.teachingAssignments
            .filter((a) => a.subject?.name)
            .map((a) => [a.subject.name, a.subject.name]),
        ).values(),
      );

      const classes = Array.from(
        new Map(
          teacher.teachingAssignments
            .filter((a) => a.classSection?.name)
            .map((a) => [
              `${a.classSection.level || ''} ${a.classSection.name}`,
              a.classSection,
            ]),
        ).values(),
      ).map((c) => `${c.level || ''} ${c.name}`.trim());

      const subjectIds = [
        ...new Set(
          teacher.teachingAssignments
            .filter((a) => a.subjectId)
            .map((a) => a.subjectId as string),
        ),
      ];

      let rating: string | null = null;
      if (activeTerm && subjectIds.length > 0) {
        const scores: number[] = [];
        for (const a of teacher.teachingAssignments) {
          const arr = scoresByPair.get(`${a.subjectId}:${a.classSectionId}`);
          if (arr) scores.push(...arr);
        }

        if (scores.length > 0) {
          const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          rating = `${Math.round(avg)}%`;
        }
      }

      return {
        id: teacher.id,
        userId: teacher.userId,
        name: `${teacher.firstName} ${teacher.lastName}`,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.user?.email || '',
        phone: teacher.phone || '',
        active: teacher.user?.isActive ?? false,
        subjects,
        classes,
        rating,
        status: teacher.user?.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    });

    await this.cacheService.setCachedAggregate(
      'hod:dept-teachers',
      cacheKey,
      result,
      300,
    );

    return result;
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

  private getCacheKey(method: string, params: Record<string, unknown>): string {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(params).sort()) {
      const value = params[key];
      normalized[key] = value === undefined ? '' : value;
    }
    return `${method}:${JSON.stringify(normalized)}`;
  }
}

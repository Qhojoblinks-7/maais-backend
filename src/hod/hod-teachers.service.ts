import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, AuditAction } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { OCCService } from '../common/services/occ.service';
import * as argon2 from 'argon2';

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
    page = 1,
    limit = 50,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true, departmentId: true },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const cacheKey = this.getCacheKey('getTeacherSubmissionStatus', {
      userId,
      role,
      academicYearId: academicYearId ?? '',
      termNumber: termNumber ?? '',
      page,
      limit,
    });
    const cached = await this.cacheService.getCachedAggregate<
      Awaited<ReturnType<HODTeacherService['getTeacherSubmissionStatus']>>
    >('hod:teacher-status', cacheKey);
    if (cached) return cached;

    let targetTerm = null;
    if (academicYearId && termNumber) {
      targetTerm = await this.prisma.term.findFirst({
        where: { academicYearId, termNumber: termNumber as any },
        select: { id: true },
      });
    }
    if (!targetTerm) {
      targetTerm = await this.prisma.term.findFirst({
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      });
    }

    const deptId = staffProfile.departmentId;

    const [homeTeachers, visitingTeachers, homeCount, visitingCount] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where: { departmentId: deptId, user: { role: Role.TEACHER } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          teachingAssignments: {
            select: {
              classSectionId: true,
              subjectId: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.staffProfile.findMany({
        where: {
          departmentId: { not: deptId },
          user: { role: Role.TEACHER },
          teachingAssignments: {
            some: {
              classSection: {
                students: {
                  some: {
                    departmentId: deptId,
                    archivedAt: null,
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          teachingAssignments: {
            select: {
              classSectionId: true,
              subjectId: true,
            },
          },
        },
      }),
      this.prisma.staffProfile.count({
        where: { departmentId: deptId, user: { role: Role.TEACHER } },
      }),
      this.prisma.staffProfile.count({
        where: {
          departmentId: { not: deptId },
          user: { role: Role.TEACHER },
          teachingAssignments: {
            some: {
              classSection: {
                students: {
                  some: {
                    departmentId: deptId,
                    archivedAt: null,
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const visitingSet = new Set(visitingTeachers.map((t) => t.id));
    const allTeachers = [
      ...homeTeachers.map((t) => ({ ...t, isVisiting: false })),
      ...visitingTeachers.map((t) => ({ ...t, isVisiting: true })),
    ];

    const teachers = allTeachers.slice((page - 1) * limit, page * limit);
    const teacherIds = teachers.map((t) => t.id);
    const totalTeachers = homeCount + visitingCount;

    const allClassIds = Array.from(
      new Set(
        teachers.flatMap((t) =>
          t.teachingAssignments.map((a) => a.classSectionId),
        ),
      ),
    );
    const allSubjectIds = Array.from(
      new Set(
        teachers.flatMap((t) => t.teachingAssignments.map((a) => a.subjectId)),
      ),
    );

    const studentsByClass = new Map<string, string[]>();
    if (allClassIds.length > 0) {
      const students = await this.prisma.studentProfile.findMany({
        where: { currentClassId: { in: allClassIds }, archivedAt: null },
        select: { id: true, currentClassId: true },
      });
      for (const s of students) {
        if (!s.currentClassId) continue;
        const arr = studentsByClass.get(s.currentClassId) ?? [];
        arr.push(s.id);
        studentsByClass.set(s.currentClassId, arr);
      }
    }

    const allStudentIds = Array.from(studentsByClass.values()).flat();

    const [gradeEntries, attRows] = await Promise.all([
      targetTerm && allSubjectIds.length > 0
        ? this.prisma.gradeEntry.findMany({
            where: {
              termId: targetTerm.id,
              subjectId: { in: allSubjectIds },
              submittedById: { in: teacherIds },
            },
            select: {
              subjectId: true,
              totalScore: true,
              submittedById: true,
              hasObservation: true,
            },
          })
        : Promise.resolve([]),
      targetTerm && allStudentIds.length > 0
        ? this.prisma.attendanceRecord.groupBy({
            by: ['studentId'],
            where: { studentId: { in: allStudentIds }, termId: targetTerm.id },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const gradeAggBySubject = new Map<
      string,
      { total: number; signed: number; obs: number }
    >();
    for (const g of gradeEntries) {
      const cur = gradeAggBySubject.get(g.subjectId) ?? {
        total: 0,
        signed: 0,
        obs: 0,
      };
      if (g.totalScore !== null) cur.total += 1;
      if (g.submittedById !== null) cur.signed += 1;
      if (g.hasObservation) cur.obs += 1;
      gradeAggBySubject.set(g.subjectId, cur);
    }

    const attCountByStudent = new Map<string, number>();
    for (const r of attRows) {
      attCountByStudent.set(r.studentId, r._count._all);
    }

    const submissions = teachers.map((teacher) => {
      const subjectIds = teacher.teachingAssignments.map((a) => a.subjectId);
      const classIds = teacher.teachingAssignments.map((a) => a.classSectionId);

      const studentIds = classIds.flatMap((c) => studentsByClass.get(c) ?? []);
      const studentCount = classIds.reduce(
        (sum, c) => sum + (studentsByClass.get(c)?.length ?? 0),
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
        totalExpected > 0 ? Math.round((gradeCount / totalExpected) * 100) : 0;
      const attendancePct =
        totalAttendance > 0
          ? Math.round((attendanceCount / totalAttendance) * 100)
          : 0;
      const signOffPct =
        totalExpected > 0 ? Math.round((signedCount / totalExpected) * 100) : 0;
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
        email: '',
        status:
          progress === 100
            ? 'SUBMITTED'
            : progress > 0
              ? 'IN_PROGRESS'
              : 'DRAFT',
        progress,
        isVisiting: teacher.isVisiting ?? false,
      };
    });

    const result = {
      data: submissions,
      total: totalTeachers,
      page,
      limit,
      pages: Math.ceil(totalTeachers / limit),
    };

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
    params?: { search?: string; page?: number; limit?: number },
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can view department teachers');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true, departmentId: true },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const skip = (page - 1) * limit;

    const cacheKey = this.getCacheKey('getDepartmentTeachers', {
      userId,
      role,
      search: params?.search ?? '',
      page,
      limit,
    });
    const cached = await this.cacheService.getCachedAggregate<
      Awaited<ReturnType<HODTeacherService['getDepartmentTeachers']>>
    >('hod:dept-teachers', cacheKey);
    if (cached) return cached;

    const deptId = staffProfile.departmentId;

    const baseWhere: any = {
      user: { role: { in: [Role.TEACHER, Role.HOD] } },
    };

    if (params?.search) {
      const search = params.search.toLowerCase();
      baseWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const homeWhere = { ...baseWhere, departmentId: deptId };

    const classSectionsWithDeptStudents = await this.prisma.classSection.findMany({
      where: {
        students: {
          some: {
            departmentId: deptId,
            archivedAt: null,
          },
        },
      },
      select: { id: true },
    });
    const classSectionIds = classSectionsWithDeptStudents.map((cs) => cs.id);

    const visitingWhere = {
      ...baseWhere,
      departmentId: { not: deptId },
      teachingAssignments: {
        some: {
          classSectionId: { in: classSectionIds },
        },
      },
    };

    const includeClause = {
      user: { select: { email: true, isActive: true } },
      teachingAssignments: {
        include: {
          subject: { select: { name: true } },
          classSection: { select: { name: true, level: true } },
        },
      },
    };

    const [homeTeachers, visitingTeachers, homeCount, visitingCount] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where: homeWhere,
        include: includeClause,
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.staffProfile.findMany({
        where: visitingWhere,
        include: includeClause,
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.staffProfile.count({ where: homeWhere }),
      this.prisma.staffProfile.count({ where: visitingWhere }),
    ]);

    const visitingIds = new Set(visitingTeachers.map((t) => t.id));
    const allTeachers = [
      ...homeTeachers.map((t) => ({ ...t, isVisiting: false })),
      ...visitingTeachers.map((t) => ({ ...t, isVisiting: true })),
    ];

    allTeachers.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    const teachers = allTeachers.slice(skip, skip + limit);
    const total = homeCount + visitingCount;

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    const allSubjectIds = Array.from(
      new Set(
        teachers.flatMap((t) => t.teachingAssignments.map((a) => a.subjectId)),
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
        isVisiting: teacher.isVisiting ?? false,
      };
    });

    const paginatedResult = {
      data: result,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };

    await this.cacheService.setCachedAggregate(
      'hod:dept-teachers',
      cacheKey,
      paginatedResult,
      300,
    );

    return paginatedResult;
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
      if (!teacher) {
        throw new ForbiddenException('Teacher not found');
      }
      const isHomeTeacher = teacher.departmentId === staffProfile.departmentId;
      if (!isHomeTeacher) {
        const visitingAssignment = await this.prisma.teachingAssignment.findFirst({
          where: {
            teacherId: teacherId,
            classSection: {
              students: {
                some: {
                  departmentId: staffProfile.departmentId,
                },
              },
            },
          },
        });
        if (!visitingAssignment) {
          throw new ForbiddenException(
            'You can only reset passwords for teachers in your department',
          );
        }
      }
    }

    const passwordHash = await this.hashPassword(newPassword);
    return this.prisma.user.updateMany({
      where: { staffProfile: { id: teacherId } },
      data: { passwordHash },
    });
  }

  private async hashPassword(password: string): Promise<string> {
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

    const deptId = staffProfile.departmentId;

    const homeUserIds = await this.prisma.user
      .findMany({
        where: {
          staffProfile: { departmentId: deptId },
        },
        select: { id: true },
      })
      .then((u) => u.map((x) => x.id));

    const visitingUserIds = await this.prisma.user
      .findMany({
        where: {
          staffProfile: {
            departmentId: { not: deptId },
            teachingAssignments: {
              some: {
                classSection: {
                  students: {
                    some: {
                      departmentId: deptId,
                    },
                  },
                },
              },
            },
          },
        },
        select: { id: true },
      })
      .then((u) => u.map((x) => x.id));

    const departmentUserIds = [...homeUserIds, ...visitingUserIds];

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

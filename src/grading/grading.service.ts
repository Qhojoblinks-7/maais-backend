import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GradeRemark, Role, AuditAction } from '@prisma/client';
import { InterventionsService } from '../interventions/interventions.service';
import { OCCService } from '../common/services/occ.service';

// GH SHS Standard WAEC grading
const GRADE_BOUNDARIES = [
  {
    grade: 'A1',
    min: 80,
    max: 100,
    remark: GradeRemark.EXCELLENT,
    smartRemarks: [
      'Outstanding performance',
      'Exceptional academic achievement',
      'An excellent student â€” keep it up!',
    ],
  },
  {
    grade: 'B2',
    min: 70,
    max: 79,
    remark: GradeRemark.VERY_GOOD,
    smartRemarks: [
      'Very good performance',
      'Great effort shown',
      'Well done â€” aim for the top!',
    ],
  },
  {
    grade: 'B3',
    min: 65,
    max: 69,
    remark: GradeRemark.GOOD,
    smartRemarks: [
      'Good performance',
      'Commendable effort',
      'Keep pushing for excellence',
    ],
  },
  {
    grade: 'C4',
    min: 60,
    max: 64,
    remark: GradeRemark.CREDIT,
    smartRemarks: [
      'Credit performance',
      'Good but can do better',
      'Consistent effort required',
    ],
  },
  {
    grade: 'C5',
    min: 55,
    max: 59,
    remark: GradeRemark.PASS,
    smartRemarks: [
      'Can do better with more effort',
      'More dedication needed',
      'Revise frequently',
    ],
  },
  {
    grade: 'C6',
    min: 50,
    max: 54,
    remark: GradeRemark.PASS,
    smartRemarks: [
      'Satisfactory â€” more work needed',
      'Pay closer attention in class',
    ],
  },
  {
    grade: 'D7',
    min: 45,
    max: 49,
    remark: GradeRemark.WEAK_PASS,
    smartRemarks: [
      'Weak performance â€” please seek help',
      'Extra classes recommended',
    ],
  },
  {
    grade: 'E8',
    min: 40,
    max: 44,
    remark: GradeRemark.WEAK_PASS,
    smartRemarks: [
      'Very weak â€” urgent improvement needed',
      'Must attend remedial sessions',
    ],
  },
  {
    grade: 'F9',
    min: 0,
    max: 39,
    remark: GradeRemark.FAILURE,
    smartRemarks: [
      'Failed â€” must repeat this subject',
      'Serious academic counselling required',
    ],
  },
];

export interface UpsertGradeDto {
  studentId: string;
  subjectId: string;
  termId: string;
  version?: number;
  classScore?: number;
  examScore?: number;
  remark?: string;
  hasObservation?: boolean;
  observationText?: string;
  labSafety?: boolean;
  flagged?: boolean;
}

export interface CorrectGradeDto {
  gradeEntryId: string;
  version?: number;
  fieldChanged: 'classScore' | 'examScore' | 'remark';
  newValue: string;
  reason: string;
}

@Injectable()
export class GradingService {
  constructor(
    private prisma: PrismaService,
    private interventionsService: InterventionsService,
    private occService: OCCService,
  ) {}

  computeGrade(classScore: number, examScore: number) {
    const total = Math.round(classScore + examScore);
    const boundary =
      GRADE_BOUNDARIES.find((b) => total >= b.min && total <= b.max) ||
      GRADE_BOUNDARIES[GRADE_BOUNDARIES.length - 1];

    if (total > 100) {
      return {
        totalScore: total,
        grade: GRADE_BOUNDARIES[0].grade,
        remark: GRADE_BOUNDARIES[0].remark,
        smartRemarks: GRADE_BOUNDARIES[0].smartRemarks,
      };
    }

    return {
      totalScore: total,
      grade: boundary.grade,
      remark: boundary.remark,
      smartRemarks: boundary.smartRemarks,
    };
  }

  getSmartRemarks(grade: string): string[] {
    return GRADE_BOUNDARIES.find((b) => b.grade === grade)?.smartRemarks ?? [];
  }

  async upsertGrade(
    dto: any,
    submittedById: string,
    term?: any,
    existingEntry?: any,
    previousTermId?: string | null,
  ) {
    console.log(
      `[GradingService] upsertGrade called:`,
      JSON.stringify(dto, null, 2),
    );

    if (!dto.studentId) {
      console.error(`[GradingService] Missing studentId in dto`);
      throw new Error('studentId is required');
    }
    if (!dto.subjectId) {
      console.error(`[GradingService] Missing subjectId in dto`);
      throw new Error('subjectId is required');
    }
    if (!dto.termId) {
      console.error(`[GradingService] Missing termId in dto`);
      throw new Error('termId is required');
    }

    const activeTerm =
      term ??
      (await this.prisma.term.findUniqueOrThrow({
        where: { id: dto.termId },
      }));

    console.log(
      `[GradingService] Term found: id=${activeTerm.id}, isLocked=${activeTerm.isLocked}`,
    );

    if (activeTerm.isLocked) {
      throw new ForbiddenException(
        'Term is locked. Grades cannot be modified.',
      );
    }

    let totalScore: number | undefined;
    let grade: string | undefined;

    if (dto.classScore !== undefined || dto.examScore !== undefined) {
      const cs = dto.classScore ?? 0;
      const es = dto.examScore ?? 0;
      const computed = this.computeGrade(cs, es);
      totalScore = computed.totalScore;
      grade = computed.grade;
    }

    const existing =
      existingEntry ??
      (await this.prisma.gradeEntry.findFirst({
        where: {
          studentId: dto.studentId,
          subjectId: dto.subjectId,
          termId: dto.termId,
        },
        select: {
          id: true,
          classScore: true,
          examScore: true,
          totalScore: true,
          grade: true,
          isLocked: true,
          version: true,
        },
      }));

    if (existing?.isLocked) {
      throw new ForbiddenException(
        'Grade entry is locked. Contact HOD to unlock.',
      );
    }

    if (existing) {
      const clientVersion = dto.version ?? existing.version;
      await this.occService.verifyVersion(
        'GradeEntry',
        existing.id,
        clientVersion,
      );
    }

    const entry = await this.prisma.gradeEntry.upsert({
      where: {
        studentId_subjectId_termId: {
          studentId: dto.studentId,
          subjectId: dto.subjectId,
          termId: dto.termId,
        },
      },
      create: {
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        termId: dto.termId,
        classScore: dto.classScore,
        examScore: dto.examScore,
        totalScore,
        grade,
        remark: dto.remark,
        hasObservation: dto.hasObservation ?? false,
        observationText: dto.observationText,
        labSafetyCompliance: dto.labSafety ?? false,
        flaggedForReview: dto.flagged ?? false,
        submittedById,
        submittedAt: new Date(),
        isApproved: false,
      },
      update: {
        classScore: dto.classScore,
        examScore: dto.examScore,
        totalScore,
        grade,
        remark: dto.remark,
        submittedById,
        submittedAt: new Date(),
        isApproved: false,
        ...(dto.hasObservation !== undefined && {
          hasObservation: dto.hasObservation,
        }),
        ...(dto.observationText !== undefined && {
          observationText: dto.observationText,
        }),
        ...(dto.labSafety !== undefined && {
          labSafetyCompliance: dto.labSafety,
        }),
        ...(dto.flagged !== undefined && {
          flaggedForReview: dto.flagged,
        }),
      },
      include: { student: true, subject: true },
    });

    let version: number;
    if (existing) {
      version = await this.occService.bumpVersion('GradeEntry', entry.id);
    } else {
      const fresh = await this.prisma.gradeEntry.findUnique({
        where: { id: entry.id },
        select: { version: true },
      });
      version = fresh!.version;
    }

    await this.prisma.auditLog.create({
      data: {
        userId: submittedById,
        action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
        entity: 'GradeEntry',
        entityId: entry.id,
        payload: {
          studentId: dto.studentId,
          subjectId: dto.subjectId,
          termId: dto.termId,
          oldValue: existing
            ? {
                classScore: existing.classScore,
                examScore: existing.examScore,
                totalScore: existing.totalScore,
                grade: existing.grade,
              }
            : null,
          newValue: {
            classScore: dto.classScore,
            examScore: dto.examScore,
            totalScore,
            grade,
          },
          justification: null,
        },
      },
    });

    const resolvedPreviousTermId =
      previousTermId ?? (await this.getPreviousTermId(dto.termId));
    if (resolvedPreviousTermId) {
      try {
        await this.interventionsService.checkPerformanceDrop(
          dto.studentId,
          dto.termId,
          resolvedPreviousTermId,
        );
      } catch {}
    }

    return { ...entry, version };
  }

  private async getPreviousTermId(
    currentTermId: string,
  ): Promise<string | null> {
    const currentTerm = await this.prisma.term.findUniqueOrThrow({
      where: { id: currentTermId },
      select: { academicYearId: true, termNumber: true },
    });

    const termOrder: Record<string, number> = {
      SEMESTER_1: 1,
      SEMESTER_2: 2,
    };
    const currentNum = termOrder[currentTerm.termNumber];

    const candidates = await this.prisma.term.findMany({
      where: { academicYearId: currentTerm.academicYearId },
      orderBy: { termNumber: 'desc' },
    });

    for (const t of candidates) {
      if (termOrder[t.termNumber] < currentNum) {
        return t.id;
      }
    }

    const prevYear = await this.prisma.academicYear.findFirst({
      where: { id: { not: currentTerm.academicYearId } },
      orderBy: { startDate: 'desc' },
    });

    if (!prevYear) return null;

    const prevYearTerms = await this.prisma.term.findMany({
      where: { academicYearId: prevYear.id },
      orderBy: { termNumber: 'desc' },
    });

    return prevYearTerms[0]?.id ?? null;
  }

  async approveGrade(
    gradeEntryId: string,
    approvedById: string,
    userRole: Role,
    clientVersion?: number,
  ) {
    if (
      userRole !== Role.HOD &&
      userRole !== Role.HEADMASTER &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can approve grade entries',
      );
    }

    if (clientVersion) {
      await this.occService.verifyVersion(
        'GradeEntry',
        gradeEntryId,
        clientVersion,
      );
    }

    const entry = await this.prisma.gradeEntry.update({
      where: { id: gradeEntryId },
      data: { isApproved: true, approvedById, approvedAt: new Date() },
    });

    const updated = await this.prisma.gradeEntry.findUnique({
      where: { id: gradeEntryId },
      select: { id: true, version: true, isApproved: true, approvedAt: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: approvedById,
        action: AuditAction.UPDATE,
        entity: 'GradeEntry',
        entityId: gradeEntryId,
        payload: {
          oldValue: { isApproved: false },
          newValue: { isApproved: true, approvedAt: new Date().toISOString() },
        },
      },
    });

    return { ...updated, isApproved: true, approvedAt: entry.approvedAt };
  }

  async bulkApproveGrades(ids: string[], approvedById: string, userRole: Role) {
    if (
      userRole !== Role.HOD &&
      userRole !== Role.HEADMASTER &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can approve grade entries',
      );
    }

    const result = await this.prisma.gradeEntry.updateMany({
      where: { id: { in: ids } },
      data: { isApproved: true, approvedById, approvedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: approvedById,
        action: AuditAction.UPDATE,
        entity: 'GradeEntry',
        entityId: ids[0] || 'bulk',
        payload: {
          approvedCount: result.count,
          ids,
        },
      },
    });

    return result;
  }

  async getClassPerformanceSummary(
    classId: string,
    termId: string,
    userId?: string,
    userRole?: Role,
  ) {
    if (userRole === Role.TEACHER && userId) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { userId },
      });

      if (!staffProfile) {
        throw new ForbiddenException('Teacher profile not found');
      }

      const isAssigned = await this.prisma.teachingAssignment.findFirst({
        where: {
          teacherId: staffProfile.id,
          classSectionId: classId,
        },
      });

      if (!isAssigned) {
        throw new ForbiddenException('You are not assigned to this class');
      }
    }

    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: classId },
      include: {
        grades: {
          where: { termId },
          include: { subject: true },
        },
      },
    });

    return students.map((s) => {
      const totalGrades = s.grades.length;
      const approvedGrades = s.grades.filter((g) => g.isApproved).length;
      const progress =
        totalGrades > 0 ? (approvedGrades / totalGrades) * 100 : 0;

      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        indexNumber: s.indexNumber,
        progress,
        isFullyApproved: totalGrades > 0 && totalGrades === approvedGrades,
        gradesCount: totalGrades,
      };
    });
  }

  async lockGrade(
    gradeEntryId: string,
    lockedById: string,
    userRole: Role,
    clientVersion?: number,
  ) {
    if (
      userRole !== Role.HOD &&
      userRole !== Role.HEADMASTER &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Only HODs or above can lock grade entries');
    }

    if (clientVersion) {
      await this.occService.verifyVersion(
        'GradeEntry',
        gradeEntryId,
        clientVersion,
      );
    }

    const updated = await this.prisma.gradeEntry.update({
      where: { id: gradeEntryId },
      data: { isLocked: true, lockedById, lockedAt: new Date() },
    });

    const version = await this.occService.bumpVersion(
      'GradeEntry',
      gradeEntryId,
    );

    await this.prisma.auditLog.create({
      data: {
        userId: lockedById,
        action: AuditAction.LOCK,
        entity: 'GradeEntry',
        entityId: gradeEntryId,
        payload: { gradeEntryId, lockedById },
      },
    });

    return { ...updated, version };
  }

  async correctGrade(dto: CorrectGradeDto, changedById: string) {
    const entryVersion = dto.version ?? 1;
    const entry = await this.prisma.gradeEntry.findUniqueOrThrow({
      where: { id: dto.gradeEntryId },
      select: {
        id: true,
        classScore: true,
        examScore: true,
        grade: true,
        isLocked: true,
        version: true,
      },
    });

    if (entry.isLocked) {
      throw new ForbiddenException('Grade is locked. Contact HOD to unlock.');
    }

    await this.occService.verifyVersion('GradeEntry', entry.id, entryVersion);

    const oldValue = String(
      entry[dto.fieldChanged as keyof typeof entry] ?? '',
    );

    await this.prisma.gradeCorrection.create({
      data: {
        gradeEntryId: dto.gradeEntryId,
        changedById,
        fieldChanged: dto.fieldChanged,
        oldValue,
        newValue: dto.newValue,
        reason: dto.reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: changedById,
        action: AuditAction.GRADE_CORRECTION,
        entity: 'GradeEntry',
        entityId: dto.gradeEntryId,
        payload: {
          fieldChanged: dto.fieldChanged,
          oldValue,
          newValue: dto.newValue,
          justification: dto.reason,
        },
      },
    });

    const updateData: Record<string, any> = {
      [dto.fieldChanged]:
        dto.fieldChanged === 'remark' ? dto.newValue : parseFloat(dto.newValue),
    };

    if (dto.fieldChanged === 'classScore' || dto.fieldChanged === 'examScore') {
      const cs =
        dto.fieldChanged === 'classScore'
          ? parseFloat(dto.newValue)
          : (entry.classScore ?? 0);
      const es =
        dto.fieldChanged === 'examScore'
          ? parseFloat(dto.newValue)
          : (entry.examScore ?? 0);
      const computed = this.computeGrade(cs, es);
      updateData.totalScore = computed.totalScore;
      updateData.grade = computed.grade;
    }

    const updated = await this.prisma.gradeEntry.update({
      where: { id: dto.gradeEntryId },
      data: updateData,
      select: { id: true },
    });

    const newVersion = await this.occService.bumpVersion(
      'GradeEntry',
      dto.gradeEntryId,
    );

    return { ...updated, version: newVersion };
  }

  private async getTeacherSubjectIds(userId?: string) {
    if (!userId) return [];

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staffProfile) {
      throw new ForbiddenException('Teacher profile not found');
    }

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: staffProfile.id },
      select: { subjectId: true },
    });

    return assignments.map((assignment) => assignment.subjectId);
  }

  private async getAccessibleStudentIds(userId?: string): Promise<string[]> {
    if (!userId) return [];

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staffProfile) return [];

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: staffProfile.id },
      select: { subjectId: true, classSectionId: true },
    });

    if (assignments.length === 0) return [];

    const classSectionIds = [
      ...new Set(assignments.map((a) => a.classSectionId)),
    ];

    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: { in: classSectionIds }, archivedAt: null },
      select: { id: true },
    });

    return students.map((s) => s.id);
  }

  private async getAccessibleSubjectIds(userId?: string): Promise<string[]> {
    if (!userId) return [];

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staffProfile) return [];

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: staffProfile.id },
      select: { subjectId: true },
    });

    return [...new Set(assignments.map((a) => a.subjectId))];
  }

  private async getEffectiveTermId(termId?: string) {
    if (termId) return termId;

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    if (activeTerm) return activeTerm.id;

    const latestTerm = await this.prisma.term.findFirst({
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    return latestTerm?.id;
  }

  private async getTeacherNameMap(userIds: Array<string | null | undefined>) {
    const ids = [...new Set(userIds.filter(Boolean))] as string[];
    if (ids.length === 0) return new Map<string, string>();

    const staffProfiles = await this.prisma.staffProfile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, firstName: true, lastName: true },
    });

    return new Map(
      staffProfiles.map((staff) => [
        staff.userId,
        `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
      ]),
    );
  }

  private async getHODMap(departmentIds: string[]) {
    const ids = [...new Set(departmentIds.filter(Boolean))] as string[];
    if (ids.length === 0) return new Map<string, string>();

    const hodProfiles = await this.prisma.staffProfile.findMany({
      where: { departmentId: { in: ids }, canOversight: true },
      select: { departmentId: true, firstName: true, lastName: true },
    });

    return new Map(
      hodProfiles.map((hod) => [
        hod.departmentId,
        `${hod.firstName || ''} ${hod.lastName || ''}`.trim(),
      ]),
    );
  }

  private toObservation(entry: any, teacher = 'Unknown', hod = 'Unknown') {
    return {
      id: entry.id,
      studentId: entry.studentId,
      student: entry.student
        ? `${entry.student.firstName || ''} ${entry.student.lastName || ''}`.trim()
        : 'Unknown',
      index: entry.student?.indexNumber || '',
      class: entry.student?.currentClass?.name || 'Unknown Class',
      teacher,
      hod,
      type: entry.subject?.name || 'Unknown Subject',
      comment: entry.observationText || entry.remark || '',
      status: entry.hasObservation ? 'Logged' : 'Missing',
      date: entry.updatedAt
        ? entry.updatedAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    };
  }

  async getMissingObservationsTray(
    termId: string,
    userId?: string,
    userRole?: Role,
    options?: { page?: number; limit?: number },
  ) {
    const effectiveTermId = await this.getEffectiveTermId(termId);
    if (!effectiveTermId)
      return { data: [], total: 0, page: 1, limit: 50, pages: 0 };

    const whereClause: any = {
      termId: effectiveTermId,
      hasObservation: false,
      OR: [{ classScore: { not: null } }, { examScore: { not: null } }],
    };

    if (userRole === Role.TEACHER && userId) {
      const [accessibleStudentIds, accessibleSubjectIds] = await Promise.all([
        this.getAccessibleStudentIds(userId),
        this.getAccessibleSubjectIds(userId),
      ]);
      if (
        accessibleStudentIds.length === 0 ||
        accessibleSubjectIds.length === 0
      ) {
        return { data: [], total: 0, page: 1, limit: 50, pages: 0 };
      }
      whereClause.studentId = { in: accessibleStudentIds };
      whereClause.subjectId = { in: accessibleSubjectIds };
    }

    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 50;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.gradeEntry.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          student: {
            select: {
              indexNumber: true,
              firstName: true,
              lastName: true,
              currentClass: { select: { name: true } },
            },
          },
          subject: { select: { name: true, code: true, departmentId: true } },
        },
        orderBy: { student: { lastName: 'asc' } },
      }),
      this.prisma.gradeEntry.count({ where: whereClause }),
    ]);

    const teacherMap = await this.getTeacherNameMap(
      entries.map((entry) => entry.submittedById),
    );

    const departmentIds = [
      ...new Set(
        entries
          .map((e) => e.subject?.departmentId)
          .filter((id): id is string => !!id),
      ),
    ];
    const hodMap = await this.getHODMap(departmentIds);

    const data = entries.map((entry) => ({
      ...this.toObservation(
        entry,
        entry.submittedById
          ? teacherMap.get(entry.submittedById) || 'Unknown'
          : 'Unknown',
        entry.subject?.departmentId
          ? hodMap.get(entry.subject.departmentId) || 'Unknown'
          : 'Unknown',
      ),
      status: 'Missing',
    }));

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getObservationLogs(
    userId?: string,
    userRole?: Role,
    termId?: string,
    options?: { page?: number; limit?: number },
  ) {
    const whereClause: any = {};

    if (userRole === Role.TEACHER && userId) {
      const [accessibleStudentIds, accessibleSubjectIds] = await Promise.all([
        this.getAccessibleStudentIds(userId),
        this.getAccessibleSubjectIds(userId),
      ]);
      if (
        accessibleStudentIds.length === 0 ||
        accessibleSubjectIds.length === 0
      ) {
        return { data: [], total: 0, page: 1, limit: 50, pages: 0 };
      }
      whereClause.studentId = { in: accessibleStudentIds };
      whereClause.subjectId = { in: accessibleSubjectIds };
    }

    const effectiveTermId = termId ? termId : await this.getEffectiveTermId();

    if (effectiveTermId) {
      whereClause.termId = effectiveTermId;
    }

    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 50;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.gradeEntry.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          student: {
            select: {
              indexNumber: true,
              firstName: true,
              lastName: true,
              currentClass: { select: { name: true } },
            },
          },
          subject: { select: { name: true, code: true, departmentId: true } },
        },
        orderBy: [{ hasObservation: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.gradeEntry.count({ where: whereClause }),
    ]);

    const teacherMap = await this.getTeacherNameMap(
      entries.map((entry) => entry.submittedById),
    );

    const departmentIds = [
      ...new Set(
        entries
          .map((e) => e.subject?.departmentId)
          .filter((id): id is string => !!id),
      ),
    ];
    const hodMap = await this.getHODMap(departmentIds);

    const data = entries.map((entry) =>
      this.toObservation(
        entry,
        entry.submittedById
          ? teacherMap.get(entry.submittedById) || 'Unknown'
          : 'Unknown',
        entry.subject?.departmentId
          ? hodMap.get(entry.subject.departmentId) || 'Unknown'
          : 'Unknown',
      ),
    );

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  private async assertObservationAccess(
    entry: any,
    userId?: string,
    userRole?: Role,
  ) {
    if (userRole !== Role.TEACHER || !userId) return;

    const accessibleStudentIds = await this.getAccessibleStudentIds(userId);
    if (!accessibleStudentIds.includes(entry.studentId)) {
      throw new ForbiddenException(
        'You can only access observations for your assigned students',
      );
    }
  }

  private async resolveObservationGradeEntry(body: any) {
    if (body.gradeEntryId) {
      return this.prisma.gradeEntry.findUnique({
        where: { id: body.gradeEntryId },
        include: {
          student: {
            select: {
              indexNumber: true,
              firstName: true,
              lastName: true,
              currentClass: { select: { name: true } },
            },
          },
          subject: { select: { name: true, code: true, departmentId: true } },
        },
      });
    }

    const activeTermId = await this.getEffectiveTermId();

    if (!activeTermId) return null;

    const student = await this.prisma.studentProfile.findFirst({
      where: {
        indexNumber: body.index || body.studentIndex,
        currentClass: { name: body.class || body.className },
      },
      select: { id: true },
    });

    const subject = await this.prisma.subject.findFirst({
      where: { name: body.type || body.subject || body.subjectName },
      select: { id: true },
    });

    if (!student || !subject) return null;

    return this.prisma.gradeEntry.findUnique({
      where: {
        studentId_subjectId_termId: {
          studentId: student.id,
          subjectId: subject.id,
          termId: activeTermId,
        },
      },
      include: {
        student: {
          select: {
            indexNumber: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true } },
          },
        },
        subject: { select: { name: true, code: true, departmentId: true } },
      },
    });
  }

  async createObservation(body: any, userId?: string, userRole?: Role) {
    const comment = body.comment || body.observationText || '';
    const entry = await this.resolveObservationGradeEntry(body);

    if (!entry) {
      throw new NotFoundException('Grade entry matching observation not found');
    }

    const clientVersion = body.version ?? entry.version ?? 1;
    await this.occService.verifyVersion('GradeEntry', entry.id, clientVersion);

    await this.assertObservationAccess(entry, userId, userRole);

    const updated = await this.prisma.gradeEntry.update({
      where: { id: entry.id },
      data: {
        hasObservation: true,
        observationText: comment,
        remark: comment,
        labSafetyCompliance:
          body.labSafety ?? entry.labSafetyCompliance ?? false,
        flaggedForReview: body.flagged ?? entry.flaggedForReview ?? false,
        submittedById: userId,
        submittedAt: new Date(),
        isApproved: false,
      },
      include: {
        student: {
          select: {
            indexNumber: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true } },
          },
        },
        subject: { select: { name: true, code: true, departmentId: true } },
      },
    });

    const teacherMap = await this.getTeacherNameMap([userId]);
    const hod = updated.subject?.departmentId
      ? (await this.getHODMap([updated.subject.departmentId])).get(
          updated.subject.departmentId,
        ) || 'Unknown'
      : 'Unknown';
    return this.toObservation(
      updated,
      teacherMap.get(userId) || 'Unknown',
      hod,
    );
  }

  async updateObservation(
    observationId: string,
    body: any,
    userId?: string,
    userRole?: Role,
  ) {
    const entry = await this.prisma.gradeEntry.findUnique({
      where: { id: observationId },
      select: { id: true, version: true },
    });

    if (!entry) {
      throw new NotFoundException('Observation not found');
    }

    const clientVersion = body.version ?? entry.version ?? 1;
    await this.occService.verifyVersion(
      'GradeEntry',
      observationId,
      clientVersion,
    );

    const fullEntry = await this.prisma.gradeEntry.findUnique({
      where: { id: observationId },
      include: {
        student: {
          select: {
            indexNumber: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true } },
          },
        },
        subject: { select: { name: true, code: true, departmentId: true } },
      },
    });

    await this.assertObservationAccess(fullEntry, userId, userRole);

    const data: any = {
      hasObservation: body.hasObservation ?? true,
      submittedById: userId,
      submittedAt: new Date(),
      isApproved: false,
    };

    if (body.comment !== undefined || body.observationText !== undefined) {
      const comment = body.comment ?? body.observationText ?? '';
      data.observationText = comment;
      data.remark = comment;
    }

    if (body.labSafety !== undefined) {
      data.labSafetyCompliance = body.labSafety;
    }

    if (body.flagged !== undefined) {
      data.flaggedForReview = body.flagged;
    }

    const updated = await this.prisma.gradeEntry.update({
      where: { id: observationId },
      data,
      include: {
        student: {
          select: {
            indexNumber: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true } },
          },
        },
        subject: { select: { name: true, code: true, departmentId: true } },
      },
    });

    const teacherMap = await this.getTeacherNameMap([userId]);
    const hod = updated.subject?.departmentId
      ? (await this.getHODMap([updated.subject.departmentId])).get(
          updated.subject.departmentId,
        ) || 'Unknown'
      : 'Unknown';
    return this.toObservation(
      updated,
      teacherMap.get(userId) || 'Unknown',
      hod,
    );
  }

  async deleteObservation(observationId: string, userId?: string) {
    const entry = await this.prisma.gradeEntry.findUnique({
      where: { id: observationId },
      select: { id: true, version: true },
    });

    if (!entry) {
      throw new NotFoundException('Observation not found');
    }

    await this.occService.verifyVersion(
      'GradeEntry',
      observationId,
      entry.version ?? 1,
    );

    const updated = await this.prisma.gradeEntry.update({
      where: { id: observationId },
      data: {
        hasObservation: false,
        observationText: null,
        submittedById: userId,
        submittedAt: new Date(),
        isApproved: false,
      },
      include: {
        student: {
          select: {
            indexNumber: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true } },
          },
        },
        subject: { select: { name: true, code: true, departmentId: true } },
      },
    });

    const teacherMap = await this.getTeacherNameMap([userId]);
    const hod = updated.subject?.departmentId
      ? (await this.getHODMap([updated.subject.departmentId])).get(
          updated.subject.departmentId,
        ) || 'Unknown'
      : 'Unknown';
    return this.toObservation(
      updated,
      teacherMap.get(userId) || 'Unknown',
      hod,
    );
  }

  async getStudentTermGrades(
    studentId: string,
    termId: string,
    userRole?: Role,
  ) {
    const where: any = { studentId, termId };

    if (userRole === Role.STUDENT) {
      where.isApproved = true;
    }

    return this.prisma.gradeEntry.findMany({
      where,
      include: { subject: true, corrections: true },
      orderBy: { subject: { name: 'asc' } },
    });
  }

  async bulkUpsertGrades(entries: UpsertGradeDto[], submittedById: string) {
    if (!entries?.length) return [];

    const { termId, subjectId } = entries[0];

    const term = await this.prisma.term.findUniqueOrThrow({
      where: { id: termId },
    });

    if (term.isLocked) {
      throw new ForbiddenException(
        'Term is locked. Grades cannot be modified.',
      );
    }

    const existingEntries = await this.prisma.gradeEntry.findMany({
      where: {
        studentId: { in: entries.map((e) => e.studentId) },
        subjectId,
        termId,
      },
      select: {
        id: true,
        studentId: true,
        classScore: true,
        examScore: true,
        totalScore: true,
        grade: true,
        isLocked: true,
        version: true,
      },
    });

    const existingMap = new Map(existingEntries.map((e) => [e.studentId, e]));

    const toCreate = [];
    const toUpdate = [];
    const lockedConflicts = [];

    for (const e of entries) {
      const cs = e.classScore ?? 0;
      const es = e.examScore ?? 0;
      const computed = this.computeGrade(cs, es);
      const existing = existingMap.get(e.studentId);

      if (existing?.isLocked) {
        lockedConflicts.push(e.studentId);
        continue;
      }

      if (existing) {
        const clientVersion = e.version ?? existing.version;
        if (clientVersion !== existing.version) {
          throw new ConflictException(
            `A grade for a student in this sheet was changed elsewhere. Please refresh and retry.`,
          );
        }
        toUpdate.push({
          where: { id: existing.id },
          data: {
            classScore: e.classScore,
            examScore: e.examScore,
            totalScore: computed.totalScore,
            grade: computed.grade,
            remark: e.remark,
            submittedById,
            submittedAt: new Date(),
            isApproved: false,
            version: { increment: 1 },
          },
        });
      } else {
        toCreate.push({
          studentId: e.studentId,
          subjectId,
          termId,
          classScore: e.classScore,
          examScore: e.examScore,
          totalScore: computed.totalScore,
          grade: computed.grade,
          remark: e.remark,
          hasObservation: e.hasObservation ?? false,
          observationText: e.observationText,
          labSafetyCompliance: e.labSafety ?? false,
          flaggedForReview: e.flagged ?? false,
          submittedById,
          submittedAt: new Date(),
          isApproved: false,
        });
      }
    }

    if (lockedConflicts.length) {
      throw new ForbiddenException(
        `Grades for ${lockedConflicts.length} locked student(s) were skipped. Contact your HOD to unlock them.`,
      );
    }

    await this.prisma.$transaction([
      ...(toCreate.length
        ? [this.prisma.gradeEntry.createMany({ data: toCreate })]
        : []),
      ...toUpdate.map((u) => this.prisma.gradeEntry.update(u)),
      this.prisma.auditLog.createMany({
        data: entries.map((e) => ({
          userId: submittedById,
          action: existingMap.get(e.studentId)
            ? AuditAction.UPDATE
            : AuditAction.CREATE,
          entity: 'GradeEntry',
          entityId: existingMap.get(e.studentId)?.id ?? 'pending',
          payload: {
            studentId: e.studentId,
            subjectId,
            termId,
          },
        })),
      }),
    ]);

    await this.computeSubjectPositions(subjectId, termId);

    const studentIds = entries.map((e) => e.studentId);
    const saved = await this.prisma.gradeEntry.findMany({
      where: { studentId: { in: studentIds }, subjectId, termId },
      select: {
        id: true,
        studentId: true,
        classScore: true,
        examScore: true,
        totalScore: true,
        grade: true,
        remark: true,
        hasObservation: true,
        labSafetyCompliance: true,
        flaggedForReview: true,
        isLocked: true,
        version: true,
      },
    });

    const previousTermId = await this.getPreviousTermId(termId);
    if (previousTermId) {
      for (const e of entries) {
        try {
          await this.interventionsService.checkPerformanceDrop(
            e.studentId,
            termId,
            previousTermId,
          );
        } catch {
          /* non-blocking */
        }
      }
    }

    return saved;
  }

  async computeSubjectPositions(subjectId: string, termId: string) {
    const entries = await this.prisma.gradeEntry.findMany({
      where: { subjectId, termId, totalScore: { not: null } },
      orderBy: { totalScore: 'desc' },
    });

    let currentRank = 1;
    const updates = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (i > 0 && entry.totalScore === entries[i - 1].totalScore) {
      } else {
        currentRank = i + 1;
      }

      updates.push(
        this.prisma.gradeEntry.update({
          where: { id: entry.id },
          data: { position: currentRank },
        }),
      );
    }

    await Promise.all(updates);
  }

  async getStudentsForGrading(
    subjectId: string,
    classId: string,
    termId: string,
    userId: string,
    userRole: Role,
  ) {
    const effectiveTermId = await this.getEffectiveTermId(termId);
    if (!subjectId || !classId || !effectiveTermId) {
      return [];
    }

    let teacherId: string | undefined;
    if (userRole === Role.TEACHER) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      teacherId = staffProfile?.id;
    }

    const isAssigned = teacherId
      ? !!(await this.prisma.teachingAssignment.findFirst({
          where: { teacherId, subjectId, classSectionId: classId },
        }))
      : true;

    if (
      userRole !== Role.SUPER_ADMIN &&
      userRole !== Role.HEADMASTER &&
      !isAssigned
    ) {
      return [];
    }

    const [students, gradeEntries] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: { currentClassId: classId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          indexNumber: true,
        },
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.gradeEntry.findMany({
        where: { subjectId, termId: effectiveTermId },
        select: {
          id: true,
          studentId: true,
          classScore: true,
          examScore: true,
          totalScore: true,
          grade: true,
          remark: true,
          hasObservation: true,
          isLocked: true,
        },
      }),
    ]);

    const gradeMap = new Map(gradeEntries.map((g) => [g.studentId, g]));

    return students.map((s) => {
      const g = gradeMap.get(s.id);
      let auditStatus;
      if (g === undefined) {
        auditStatus = undefined;
      } else if (g.hasObservation) {
        auditStatus = 'COMPLETE';
      } else {
        auditStatus = 'MISSING';
      }
      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        index: s.indexNumber,
        sba: g?.classScore ?? 0,
        exam: g?.examScore ?? 0,
        final: g?.totalScore ?? 0,
        grade: g?.grade ?? '',
        auditStatus,
        remark: g?.remark ?? '',
        gradeEntryId: g?.id,
        isLocked: g?.isLocked ?? false,
      };
    });
  }

  async getComplianceWarnings(userId: string, role: Role) {
    if (
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN &&
      role !== Role.HOD
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const warnings: { severity: 'high' | 'medium' | 'low'; msg: string }[] = [];

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
    });

    if (!activeTerm) {
      warnings.push({
        severity: 'high',
        msg: 'No active term found. Term initialization required.',
      });
      return warnings;
    }

    const incompleteEntries = await this.prisma.gradeEntry.count({
      where: {
        termId: activeTerm.id,
        OR: [{ totalScore: null }, { remark: null }],
      },
    });

    if (incompleteEntries > 0) {
      warnings.push({
        severity: 'high',
        msg: `${incompleteEntries} grade entries have missing scores or remarks.`,
      });
    }

    const lockedTerm = await this.prisma.term.findFirst({
      where: { id: activeTerm.id, isLocked: true },
    });

    if (lockedTerm) {
      warnings.push({
        severity: 'medium',
        msg: 'Active term is locked. Modifications require emergency unlock.',
      });
    }

    const unapprovedEntries = await this.prisma.gradeEntry.count({
      where: {
        termId: activeTerm.id,
        isLocked: true,
        isApproved: false,
      },
    });

    if (unapprovedEntries > 0) {
      warnings.push({
        severity: 'low',
        msg: `${unapprovedEntries} locked entries await final sign-off.`,
      });
    }

    return warnings;
  }

  async getTermSummary(termId: string, userId: string, role: Role) {
    if (
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN &&
      role !== Role.HOD
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const classSections = await this.prisma.classSection.findMany({
      where: {
        teachingAssignments: {
          some: { academicYearId: term.academicYearId },
        },
      },
      select: { id: true },
    });

    const studentCount = await this.prisma.studentProfile.count({
      where: {
        currentClassId: { in: classSections.map((c) => c.id) },
        archivedAt: null,
      },
    });

    const gradeEntryCount = await this.prisma.gradeEntry.count({
      where: { termId },
    });

    const TERM_DISPLAY: Record<string, string> = {
      SEMESTER_1: 'Semester 1',
      SEMESTER_2: 'Semester 2',
    };

    const termLabel = term.academicYear
      ? `${term.academicYear.label} â€” ${TERM_DISPLAY[term.termNumber] || term.termNumber}`
      : TERM_DISPLAY[term.termNumber] || `Term ${term.termNumber}`;

    return {
      termLabel,
      studentCount,
      gradeEntryCount,
    };
  }
}


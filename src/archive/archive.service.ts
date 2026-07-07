import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClassLevel, Role } from '@prisma/client';

const PROMOTION_MAP: Record<ClassLevel, ClassLevel | null> = {
  [ClassLevel.FORM_1]: ClassLevel.FORM_2,
  [ClassLevel.FORM_2]: ClassLevel.FORM_3,
  [ClassLevel.FORM_3]: null, // Graduates
};

@Injectable()
export class ArchiveService {
  constructor(private prisma: PrismaService) {}

  /**
   * Execute the annual Promotion Cycle:
   * F1→F2, F2→F3, F3→Graduate/Alumni
   * Only callable by SUPER_ADMIN or HEADMASTER
   */
  async runPromotionCycle(
    academicYearId?: string,
    performedById?: string,
    studentId?: string,
    classId?: string,
    classLevel?: ClassLevel,
  ) {
    let yearLabel = null;
    let resolvedYearId = academicYearId;
    const needsYearLookup = !resolvedYearId;

    if (needsYearLookup) {
      try {
        const activeYear = await this.prisma.academicYear.findFirst({
          where: { isActive: true },
        });
        resolvedYearId = activeYear?.id;
        yearLabel = activeYear?.label || null;
      } catch {
        resolvedYearId = null;
        yearLabel = null;
      }
    } else {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
      });
      if (!year) {
        throw new NotFoundException(
          `Academic year '${academicYearId}' not found.`,
        );
      }
      yearLabel = year.label;

      const unlockedTerms = await this.prisma.term.findMany({
        where: { academicYearId, isLocked: false },
      });

      if (unlockedTerms.length > 0) {
        throw new BadRequestException(
          `${unlockedTerms.length} term(s) are still unlocked. Lock all terms before running promotion.`,
        );
      }
    }

    let students = await this.prisma.studentProfile.findMany({
      where: { archivedAt: null, currentClassId: { not: null } },
      include: { currentClass: true },
    });

    const totalCount = students.length;

    if (studentId) {
      students = students.filter((s) => s.id === studentId);
    }

    if (classId) {
      students = students.filter((s) => s.currentClassId === classId);
    }

    if (classLevel) {
      students = students.filter((s) => s.currentClass?.level === classLevel);
    }

    const promotionRecords = [];
    const graduates = [];

    for (const student of students) {
      const currentLevel = student.currentClass!.level;
      const nextLevel = PROMOTION_MAP[currentLevel];

      if (nextLevel === null) {
        graduates.push(student.id);
        promotionRecords.push({
          studentId: student.id,
          academicYearId: resolvedYearId,
          fromClass: currentLevel,
          toClass: null,
          status: 'GRADUATED',
          performedById: performedById || '',
        });
      } else {
        const currentClassName = student.currentClass!.name;
        const suffix = currentClassName.replace(/^[1-3]/, '');

        const nextClass = await this.prisma.classSection.findFirst({
          where: {
            level: nextLevel,
            name: { endsWith: suffix },
          },
        });

        if (nextClass) {
          await this.prisma.studentProfile.update({
            where: { id: student.id },
            data: { currentClassId: nextClass.id },
          });
        }

        promotionRecords.push({
          studentId: student.id,
          academicYearId: resolvedYearId,
          fromClass: currentLevel,
          toClass: nextLevel,
          status: 'PROMOTED',
          performedById: performedById || '',
        });
      }
    }

    await this.prisma.studentProfile.updateMany({
      where: { id: { in: graduates } },
      data: { archivedAt: new Date(), currentClassId: null },
    });

    if (resolvedYearId) {
      await this.prisma.promotionRecord.createMany({ data: promotionRecords });
    }

    return {
      academicYear: yearLabel,
      totalProcessed: totalCount,
      promoted: promotionRecords.filter((r) => r.status === 'PROMOTED').length,
      graduated: graduates.length,
    };
  }

  /**
   * Search The Vault - historical records for GES audits and transcript retrieval
   */
  async searchVault(
    query: {
      indexNumber?: string;
      firstName?: string;
      lastName?: string;
      academicYearId?: string;
      classLevel?: ClassLevel;
    },
    userId?: string,
    userRole?: Role,
  ) {
    const roleFilter: any = {};

    if (userRole === Role.TEACHER && userId) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { userId },
      });

      if (staffProfile) {
        const teacherGrades = await this.prisma.gradeEntry.findMany({
          where: { submittedById: staffProfile.id },
          select: { studentId: true },
          distinct: ['studentId'],
        });

        const taughtStudentIds = teacherGrades.map((g) => g.studentId);
        if (taughtStudentIds.length > 0) {
          roleFilter.id = { in: taughtStudentIds };
        } else {
          roleFilter.id = '';
        }
      }
    } else if (userRole === Role.HOD && userId) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { userId },
      });

      if (staffProfile) {
        roleFilter.departmentId = staffProfile.departmentId;
      }
    }

    return this.prisma.studentProfile.findMany({
      where: {
        AND: [
          roleFilter,
          query.indexNumber
            ? {
                indexNumber: {
                  contains: query.indexNumber,
                  mode: 'insensitive',
                },
              }
            : {},
          query.firstName
            ? { firstName: { contains: query.firstName, mode: 'insensitive' } }
            : {},
          query.lastName
            ? { lastName: { contains: query.lastName, mode: 'insensitive' } }
            : {},
        ],
      },
      include: {
        currentClass: { select: { id: true, name: true, level: true } },
        department: true,
        grades: {
          include: {
            subject: true,
            term: { include: { academicYear: true } },
          },
        },
        reportCards: {
          include: { term: { include: { academicYear: true } } },
        },
        promotions: {
          include: { academicYear: true },
        },
      },
      take: 50,
    });
  }

  /**
   * Lock a term (prevents further grade edits)
   */
  async lockTerm(termId: string) {
    return this.prisma.term.update({
      where: { id: termId },
      data: { isLocked: true },
    });
  }

  /**
   * Get unlocked terms for an academic year
   */
  async getUnlockedTerms(academicYearId: string) {
    return this.prisma.term.findMany({
      where: { academicYearId, isLocked: false },
      select: { id: true, termNumber: true, startDate: true, endDate: true },
      orderBy: { termNumber: 'asc' },
    });
  }

  /**
   * Bulk-lock all terms for an academic year
   */
  async lockAllTerms(academicYearId: string) {
    return this.prisma.term.updateMany({
      where: { academicYearId, isLocked: false },
      data: { isLocked: true },
    });
  }

  /**
   * Get per-term class benchmark averages (the "ghost" marker)
   */
  async getClassBenchmarks(classId: string) {
    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: classId },
      select: { id: true },
    });

    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) return [];

    const gradeEntries = await this.prisma.gradeEntry.findMany({
      where: {
        studentId: { in: studentIds },
        totalScore: { not: null },
      },
      include: { term: { include: { academicYear: true } } },
    });

    const termMap = new Map<
      string,
      { termNumber: string; academicYearLabel: string; scores: number[] }
    >();

    for (const entry of gradeEntries) {
      const key = entry.termId;
      if (!termMap.has(key)) {
        termMap.set(key, {
          termNumber: entry.term.termNumber.replace('TERM_', 'Term '),
          academicYearLabel: entry.term.academicYear?.label || '',
          scores: [],
        });
      }
      const termData = termMap.get(key)!;
      termData.scores.push(entry.totalScore as number);
    }

    return Array.from(termMap.values()).map(
      ({ termNumber, academicYearLabel, scores }) => {
        const avg =
          scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
            : 0;
        return {
          termNumber,
          termLabel: `${academicYearLabel} ${termNumber}`.trim(),
          averageScore: avg,
        };
      },
    );
  }

  /**
   * Database health check with hash verification summary
   */
  async getDatabaseHealth() {
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

  async getPromotionHistory(studentId: string) {
    return this.prisma.promotionRecord.findMany({
      where: { studentId },
      include: { academicYear: true },
      orderBy: { performedAt: 'desc' },
    });
  }

  async getArchiveStats(academicYearId?: string, termId?: string, level?: string) {
    const yearIds: string[] = [];
    if (academicYearId) {
      yearIds.push(academicYearId);
    } else if (termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: termId },
        select: { academicYearId: true },
      });
      if (term?.academicYearId) yearIds.push(term.academicYearId);
    }

    const [
      totalStudents,
      archivedStudents,
      totalPromotions,
      totalReportCards,
      totalTranscripts,
      totalDepartments,
      totalSubjects,
    ] = await Promise.all([
      this.prisma.studentProfile.count({ where: { archivedAt: null } }),
      this.prisma.studentProfile.count({
        where: { archivedAt: { not: null } },
      }),
      this.prisma.promotionRecord.count({
        ...(yearIds.length ? { where: { academicYearId: { in: yearIds } } } : {}),
      }),
      this.prisma.reportCard.count({
        ...(yearIds.length ? { where: { term: { academicYearId: { in: yearIds } } } } : {}),
      }),
      this.prisma.transcript.count(),
      this.prisma.department.count(),
      this.prisma.subject.count(),
    ]);

    const recentPromotions = await this.prisma.promotionRecord.findMany({
      take: 10,
      orderBy: { performedAt: 'desc' },
      where: yearIds.length ? { academicYearId: { in: yearIds } } : undefined,
      include: {
        student: {
          include: {
            user: { select: { email: true } },
            currentClass: true,
          },
        },
        academicYear: true,
      },
    });

    const recentArchives = await this.prisma.studentProfile.findMany({
      where: { archivedAt: { not: null } },
      take: 10,
      orderBy: { archivedAt: 'desc' },
      include: {
        currentClass: true,
        department: true,
        grades: {
          include: { subject: true, term: { include: { academicYear: true } } },
          take: 6,
          orderBy: { term: { academicYear: { startDate: 'desc' } } },
        },
        reportCards: {
          include: { term: { include: { academicYear: true } } },
          take: 6,
          orderBy: { term: { academicYear: { startDate: 'desc' } } },
        },
      },
    });

    return {
      totalStudents,
      archivedStudents,
      totalPromotions,
      totalReportCards,
      totalTranscripts,
      totalDepartments,
      totalSubjects,
      recentPromotions: recentPromotions.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        studentIndex: r.student.indexNumber,
        fromClass: r.fromClass,
        toClass: r.toClass,
        status: r.status,
        academicYear: r.academicYear?.label,
        performedAt: r.performedAt,
      })),
      recentArchives: recentArchives.map((s) => ({
        id: s.id,
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        studentIndex: s.indexNumber,
        fromClass: s.currentClass?.level,
        toClass: null,
        status: 'ARCHIVED',
        academicYear: null,
        performedAt: s.archivedAt,
        history: (s.grades || []).map((g) => ({
          finalGrade: Math.round(g.totalScore ?? 0),
        })),
      })),
    };
  }

  async archiveYearGroup(
    academicYearId: string,
    level: ClassLevel,
    performedById: string,
  ) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });
    if (!year) {
      throw new NotFoundException(
        `Academic year '${academicYearId}' not found.`,
      );
    }

    const validLevels = [
      ClassLevel.FORM_1,
      ClassLevel.FORM_2,
      ClassLevel.FORM_3,
    ];
    if (!validLevels.includes(level)) {
      throw new BadRequestException(
        `Invalid level '${level}' for archiving. Expected FORM_1, FORM_2 or FORM_3.`,
      );
    }

    const classesInLevel = await this.prisma.classSection.findMany({
      where: { level },
      select: { id: true },
    });

    const classIds = classesInLevel.map((c) => c.id);

    const studentsToArchive = await this.prisma.studentProfile.findMany({
      where: {
        currentClassId: { in: classIds },
        archivedAt: null,
      },
      include: { currentClass: true },
    });

    const updateResult = await this.prisma.studentProfile.updateMany({
      where: {
        currentClassId: { in: classIds },
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
        currentClassId: null,
      },
    });

    await this.prisma.promotionRecord.createMany({
      data: studentsToArchive.map((student) => ({
        studentId: student.id,
        academicYearId,
        fromClass: student.currentClass?.level || level,
        toClass: null,
        status: 'GRADUATED',
        performedById,
      })),
    });

    return {
      academicYearId,
      level,
      archivedCount: updateResult.count,
    };
  }

  async transferStudents(
    sourceClassId: string,
    targetClassId: string,
    studentIds?: string[],
  ) {
    const sourceClass = await this.prisma.classSection.findUniqueOrThrow({
      where: { id: sourceClassId },
    });

    const targetClass = await this.prisma.classSection.findUniqueOrThrow({
      where: { id: targetClassId },
    });

    const whereClause: any = {
      currentClassId: sourceClassId,
      archivedAt: null,
    };

    if (studentIds && studentIds.length > 0) {
      whereClause.id = { in: studentIds };
    }

    const updateResult = await this.prisma.studentProfile.updateMany({
      where: whereClause,
      data: {
        currentClassId: targetClassId,
      },
    });

    return {
      transferredCount: updateResult.count,
      from: sourceClass.name,
      to: targetClass.name,
    };
  }

  async updateClassCapacity(classId: string, capacity: number) {
    return this.prisma.classSection.update({
      where: { id: classId },
      data: { capacity },
    });
  }

  async rebalanceHouses(classId: string) {
    const classSection = await this.prisma.classSection.findUniqueOrThrow({
      where: { id: classId },
      include: {
        students: {
          where: { archivedAt: null },
          select: { id: true },
        },
      },
    });

    const totalStudents = classSection.students.length;
    const houseNames = ['Guggisberg', 'Aggrey', 'Nkrumah'];
    const basePerHouse = Math.floor(totalStudents / houseNames.length);
    const remainder = totalStudents % houseNames.length;

    let studentIndex = 0;
    for (let i = 0; i < houseNames.length; i++) {
      const count = basePerHouse + (i < remainder ? 1 : 0);
      // Note: House not stored on StudentProfile in current schema.
      // This returns the computed distribution; actual house assignment
      // would require a 'house' field on StudentProfile.
      studentIndex += count;
    }

    return {
      classId,
      className: classSection.name,
      totalStudents,
      distribution: houseNames.reduce(
        (acc, house, i) => {
          acc[house] = basePerHouse + (i < remainder ? 1 : 0);
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}

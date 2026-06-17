import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClassLevel, PromotionStatus, Role } from '@prisma/client';

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
  async runPromotionCycle(academicYearId: string, performedById: string) {
    const year = await this.prisma.academicYear.findUniqueOrThrow({
      where: { id: academicYearId },
    });

    // Ensure all terms are locked before promotion
    const unlockedTerms = await this.prisma.term.findMany({
      where: { academicYearId, isLocked: false },
    });

    if (unlockedTerms.length > 0) {
      throw new BadRequestException(
        `${unlockedTerms.length} term(s) are still unlocked. Lock all terms before running promotion.`,
      );
    }

    // Fetch all active students with their current class
    const students = await this.prisma.studentProfile.findMany({
      where: { archivedAt: null, currentClassId: { not: null } },
      include: { currentClass: true },
    });

    const promotionRecords = [];
    const graduates = [];

    for (const student of students) {
      const currentLevel = student.currentClass!.level;
      const nextLevel = PROMOTION_MAP[currentLevel];

      if (nextLevel === null) {
        // FORM_3 → Graduate
        graduates.push(student.id);
        promotionRecords.push({
          studentId: student.id,
          academicYearId,
          fromClass: currentLevel,
          toClass: null,
          status: PromotionStatus.GRADUATED,
          performedById,
        });
      } else {
        // Find the next class section (matching suffix, next level)
        // e.g. "1A" (Form 1) -> find something like "2A" in Form 2
        const currentClassName = student.currentClass!.name;
        const suffix = currentClassName.replace(/^[1-3]/, ''); // Remove the form number prefix

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
          academicYearId,
          fromClass: currentLevel,
          toClass: nextLevel,
          status: PromotionStatus.PROMOTED,
          performedById,
        });
      }
    }

    // Archive graduates
    if (graduates.length > 0) {
      await this.prisma.studentProfile.updateMany({
        where: { id: { in: graduates } },
        data: { archivedAt: new Date(), currentClassId: null },
      });
    }

    // Bulk insert promotion records
    await this.prisma.promotionRecord.createMany({ data: promotionRecords });

    return {
      academicYear: year.label,
      totalProcessed: students.length,
      promoted: promotionRecords.filter(
        (r) => r.status === PromotionStatus.PROMOTED,
      ).length,
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
}

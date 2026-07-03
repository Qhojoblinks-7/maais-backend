import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { InterventionsService } from './interventions.service';

@Injectable()
export class InterventionSchedulerService {
  private readonly logger = new Logger(InterventionSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private interventionsService: InterventionsService,
  ) {}

  // Runs daily at midnight to check all students for performance drops
  // Creates intervention alerts when current average drops >= 15% from previous average
  @Cron('0 0 0 * * *')
  async handleCron() {
    this.logger.log(
      'Starting automated performance drop check for all students',
    );

    try {
      const activeTerm = await this.prisma.term.findFirst({
        where: { isActive: true },
      });

      if (!activeTerm) {
        this.logger.warn('No active term found, skipping automated check');
        return;
      }

      const students = await this.prisma.studentProfile.findMany({
        where: { archivedAt: null },
        select: { id: true },
      });

      this.logger.log(
        `Checking ${students.length} students for performance drops`,
      );

      for (const student of students) {
        try {
          const previousTermId = await this.getPreviousTermId(activeTerm.id);
          if (previousTermId) {
            await this.interventionsService.checkPerformanceDrop(
              student.id,
              activeTerm.id,
              previousTermId,
            );
          }
        } catch (err) {
          this.logger.error(
            `Failed to check student ${student.id}: ${err.message}`,
          );
        }
      }

      this.logger.log('Automated performance drop check completed');
    } catch (err) {
      this.logger.error(
        `Failed automated performance drop check: ${err.message}`,
      );
    }
  }

  private async getPreviousTermId(
    currentTermId: string,
  ): Promise<string | null> {
    const currentTerm = await this.prisma.term.findUnique({
      where: { id: currentTermId },
      select: { academicYearId: true, termNumber: true },
    });

    if (!currentTerm) return null;

    const termOrder: Record<string, number> = {
      TERM_1: 1,
      TERM_2: 2,
      TERM_3: 3,
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
}

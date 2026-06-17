import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class InterventionsService {
  constructor(private prisma: PrismaService) {}

  async getStudentInterventions(studentId: string, requesterId?: string, requesterRole?: Role) {
    const where: any = { studentId };

    if (requesterRole === Role.STUDENT) {
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });

      if (!student || student.userId !== requesterId) {
        throw new ForbiddenException('You can only view your own interventions');
      }
    }

    return this.prisma.interventionAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async calculateAverage(
    studentId: string,
    termId: string,
  ): Promise<number | null> {
    const result: { avg: number | null }[] = await this.prisma.$queryRaw`
      SELECT AVG(CAST(grade AS DOUBLE PRECISION)) AS avg
      FROM "Enrollment"
      WHERE "studentId" = ${studentId} AND "termId" = ${termId}
    `;
    return result?.[0]?.avg ?? null;
  }

  async checkPerformanceDrop(
    studentId: string,
    currentTermId: string,
    previousTermId: string,
  ) {
    const previous = await this.calculateAverage(studentId, previousTermId);
    const current = await this.calculateAverage(studentId, currentTermId);

    if (!previous || !current) return;

    const drop = ((previous - current) / previous) * 100;

    if (drop >= 15) {
      await this.prisma.interventionAlert.create({
        data: {
          studentId,
          previousAverage: previous,
          currentAverage: current,
          dropPercentage: drop,
          status: 'ACTIVE',
        },
      });
    }
  }
}

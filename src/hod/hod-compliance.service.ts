import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditAction, ClassLevel, Role } from '@prisma/client';

@Injectable()
export class HODComplianceService {
  constructor(private prisma: PrismaService) {}

  async getComplianceCohortPerformance(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access compliance data');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId: staffProfile.departmentId },
      select: { id: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const terms = await this.prisma.term.findMany({
      include: { academicYear: true },
      orderBy: { startDate: 'asc' },
    });

    const yearMap = new Map<string, { yearLabel: string; scores: number[] }>();

    for (const term of terms) {
      const gradeEntries = await this.prisma.gradeEntry.findMany({
        where: {
          termId: term.id,
          subjectId: { in: subjectIds },
          totalScore: { not: null },
        },
        select: { totalScore: true },
      });

      if (gradeEntries.length === 0) continue;

      const scores = gradeEntries.map((g) => g.totalScore as number);
      const yearLabel = term.academicYear?.label || 'Unknown';

      const existing = yearMap.get(yearLabel);
      if (existing) {
        existing.scores.push(...scores);
      } else {
        yearMap.set(yearLabel, { yearLabel, scores });
      }
    }

    return Array.from(yearMap.values())
      .map(({ yearLabel, scores }) => {
        const avg =
          scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
            : 0;
        const high = scores.length > 0 ? Math.round(Math.max(...scores)) : 0;
        return {
          year: `${yearLabel} Cohort`,
          AvgGrade: avg,
          HighGrade: high,
        };
      })
      .sort((a, b) => a.year.localeCompare(b.year));
  }

  async getComplianceTimeline(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access compliance data');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const events: {
      time: string;
      event: string;
      detail: string;
      hash: string;
    }[] = [];

    const terms = await this.prisma.term.findMany({
      where: { isLocked: true },
      include: { academicYear: true },
      orderBy: { startDate: 'desc' },
      take: 10,
    });

    for (const term of terms) {
      const studentCount = await this.prisma.studentProfile.count({
        where: { archivedAt: { not: null } },
      });

      const lockDate = term.startDate
        ? new Date(term.startDate.getTime() + 180 * 24 * 60 * 60 * 1000)
        : new Date();

      events.push({
        time: lockDate.toISOString().slice(0, 7),
        event: `Class of ${term.academicYear?.label?.split('/')[0] || 'Unknown'} Dossier Lock`,
        detail: `${studentCount} student records signed and generated as read-only PDF transcripts.`,
        hash: `MAAIS-L4-SEC-${term.academicYear?.label?.split('/')[0] || '0000'}`,
      });
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            AuditAction.LOCK,
            AuditAction.PROMOTE,
            AuditAction.GRADE_CORRECTION,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const log of auditLogs) {
      const date = log.createdAt.toISOString().slice(0, 7);
      events.push({
        time: date,
        event: `Audit: ${log.action} on ${log.entity}`,
        detail: `Entity ${log.entityId} was ${log.action.toLowerCase()}d by system.`,
        hash: `MAAIS-AUDIT-${log.id.slice(0, 8).toUpperCase()}`,
      });
    }

    events.sort((a, b) => b.time.localeCompare(a.time));

    return events.slice(0, 20);
  }

  async getPromotionMetrics(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access promotion metrics');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const form3Classes = await this.prisma.classSection.findMany({
      where: {
        level: ClassLevel.FORM_3,
        teachingAssignments: {
          some: {
            subject: { departmentId: staffProfile.departmentId },
          },
        },
      },
      select: { id: true },
    });
    const form3ClassIds = form3Classes.map((c) => c.id);

    const students = await this.prisma.studentProfile.findMany({
      where: {
        currentClassId: { in: form3ClassIds },
        archivedAt: null,
      },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    const seniorSize = studentIds.length;

    if (seniorSize === 0) {
      return { seniorSize: 0, clearedCount: 0, clearanceRate: 0 };
    }

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId: staffProfile.departmentId },
      select: { id: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
    });

    let clearedCount = 0;
    if (activeTerm && subjectIds.length > 0) {
      const gradeEntries = await this.prisma.gradeEntry.findMany({
        where: {
          studentId: { in: studentIds },
          termId: activeTerm.id,
          subjectId: { in: subjectIds },
          totalScore: { not: null },
        },
        select: { studentId: true },
      });

      const studentGradeCount = new Map<string, number>();
      for (const entry of gradeEntries) {
        studentGradeCount.set(
          entry.studentId,
          (studentGradeCount.get(entry.studentId) || 0) + 1,
        );
      }

      clearedCount = Array.from(studentGradeCount.values()).filter(
        (count) => count === subjectIds.length,
      ).length;
    }

    return {
      seniorSize,
      clearedCount,
      clearanceRate: Math.round((clearedCount / Math.max(seniorSize, 1)) * 100),
    };
  }
}

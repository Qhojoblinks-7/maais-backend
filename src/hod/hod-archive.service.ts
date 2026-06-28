import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class HODArchiveService {
  constructor(private prisma: PrismaService) {}

  async getInterventionAlerts(
    userId: string,
    role: Role,
    filters?: {
      startDate?: string;
      endDate?: string;
      semester?: string;
      academicYearId?: string;
      termNumber?: string;
      resolved?: boolean;
    },
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const departmentSubjects = await this.prisma.subject
      .findMany({
        where: { departmentId: staffProfile.departmentId },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subjectId: { in: departmentSubjects } },
      select: { classSectionId: true },
    });
    const classSectionIds = Array.from(
      new Set(teachingAssignments.map((ta) => ta.classSectionId)),
    );

    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: { in: classSectionIds }, archivedAt: null },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    const whereClause: any = { studentId: { in: studentIds } };
    if (filters?.resolved !== undefined) {
      whereClause.status = filters.resolved ? 'RESOLVED' : { not: 'RESOLVED' };
    }
    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate)
        whereClause.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate)
        whereClause.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.academicYearId && filters?.termNumber) {
      const term = await this.prisma.term.findFirst({
        where: {
          academicYearId: filters.academicYearId,
          termNumber: filters.termNumber as any,
        },
      });
      if (term) {
        whereClause.createdAt = whereClause.createdAt || {};
        whereClause.createdAt.gte = term.startDate;
        whereClause.createdAt.lte = term.endDate;
      }
    }

    const interventions = await this.prisma.interventionAlert.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            indexNumber: true,
            currentClass: { select: { name: true } },
          },
        },
      },
    });

    return interventions.map((i) => ({
      id: i.id,
      studentId: i.studentId,
      studentName: i.student
        ? `${i.student.firstName} ${i.student.lastName}`
        : 'Unknown Student',
      studentIndex: i.student?.indexNumber,
      subjectId: null,
      subjectName: 'Unknown',
      termId: null,
      alertType: 'PERFORMANCE_DROP',
      severity: 'MEDIUM',
      currentScore: i.currentAverage,
      previousAverageScore: i.previousAverage,
      percentageDrop: i.dropPercentage,
      triggeredBy: null,
      status: i.status,
      resolved: i.status === 'RESOLVED',
      notes: i.notes
        ? typeof i.notes === 'string'
          ? (() => {
              try {
                return JSON.parse(i.notes);
              } catch {
                return [];
              }
            })()
          : Array.isArray(i.notes)
            ? i.notes
            : []
        : [],
      createdAt: i.createdAt.toISOString(),
      resolvedAt: i.resolvedAt?.toISOString(),
      resolvedById: null,
    }));
  }

  async getArchivedDepartmentData(userId: string, role: Role, params?: any) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access archived data');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const whereClause: any = {
      archivedAt: { not: null },
      departmentId: staffProfile.departmentId,
    };
    if (params?.year) {
      whereClause.promotions = {
        some: { academicYearId: params.year },
      };
    }

    const students = await this.prisma.studentProfile.findMany({
      where: whereClause,
      include: {
        promotions: { include: { academicYear: true } },
        currentClass: { select: { name: true } },
        grades: {
          include: {
            subject: { select: { id: true, name: true } },
            term: { include: { academicYear: { select: { label: true } } } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const scoreToGradePoint = (score: number): number => {
      if (score >= 80) return 4.0;
      if (score >= 70) return 3.5;
      if (score >= 65) return 3.0;
      if (score >= 60) return 2.5;
      if (score >= 55) return 2.0;
      if (score >= 50) return 1.5;
      if (score >= 45) return 1.0;
      if (score >= 40) return 0.5;
      return 0.0;
    };

    return students.map((student) => {
      const scoreToGrade = (score: number): string => {
        if (score >= 80) return 'A1';
        if (score >= 70) return 'B2';
        if (score >= 65) return 'B3';
        if (score >= 60) return 'C4';
        if (score >= 55) return 'C5';
        if (score >= 50) return 'C6';
        if (score >= 45) return 'D7';
        if (score >= 40) return 'E8';
        return 'F9';
      };

      const subjects = student.grades.map((grade) => ({
        subject: grade.subject?.name || '',
        grade: grade.grade || scoreToGrade(grade.totalScore ?? 0),
        credits: 1,
        totalScore: grade.totalScore ?? 0,
      }));

      const termHistory = student.grades.reduce(
        (acc, grade) => {
          const key = `${grade.term?.academicYear?.label || ''}-Term ${grade.term?.termNumber || ''}`;
          if (!acc[key]) {
            acc[key] = {
              term: key,
              termGPA: 0,
              termCredits: 0,
            };
          }
          if (grade.totalScore != null) {
            acc[key].termGPA += scoreToGradePoint(grade.totalScore);
            acc[key].termCredits += 1;
          }
          return acc;
        },
        {} as Record<string, any>,
      );

      Object.values(termHistory).forEach((th: any) => {
        th.termGPA =
          th.termCredits > 0
            ? parseFloat((th.termGPA / th.termCredits).toFixed(2))
            : 0;
      });

      const termHistoryArray = Object.values(termHistory);

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        indexNumber: student.indexNumber,
        className: student.currentClass?.name || '',
        year: student.promotions[0]?.academicYear?.label || '',
        status: student.promotions.some((p) => p.status === 'GRADUATED')
          ? 'GRADUATED'
          : 'PROMOTED',
        subjects,
        termHistory: termHistoryArray,
      };
    });
  }

  async getPromotionRecommendations(userId: string, role: Role, params?: any) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { promotions: true },
    });

    const whereClause: any = {
      academicYearId: activeYear?.id || params?.year,
      status: 'PROMOTED',
    };

    if (role === Role.HOD) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { userId },
      });
      if (!staffProfile) throw new NotFoundException('HOD profile not found');

      const departmentSubjects = await this.prisma.subject
        .findMany({
          where: { departmentId: staffProfile.departmentId },
          select: { id: true },
        })
        .then((s) => s.map((x) => x.id));

      const teachingAssignments = await this.prisma.teachingAssignment.findMany(
        {
          where: { subjectId: { in: departmentSubjects } },
          select: { classSectionId: true },
        },
      );
      const classSectionIds = Array.from(
        new Set(teachingAssignments.map((ta) => ta.classSectionId)),
      );

      whereClause.student = {
        currentClassId: { in: classSectionIds },
      };
    }

    const promotions = await this.prisma.promotionRecord.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            indexNumber: true,
            currentClass: { select: { name: true } },
          },
        },
      },
    });

    return promotions.map((p) => ({
      id: p.id,
      studentId: p.studentId,
      studentName: `${p.student?.firstName || ''} ${p.student?.lastName || ''}`,
      indexNumber: p.student?.indexNumber || '',
      fromClass: p.fromClass,
      toClass: p.toClass,
      academicYear: activeYear?.label || '',
    }));
  }

  async resolveAlert(alertId: string, userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can resolve alerts');

    const alert = await this.prisma.interventionAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert) throw new NotFoundException('Intervention alert not found');

    return this.prisma.interventionAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  async addCounselingNote(
    alertId: string,
    text: string,
    userId: string,
    role: Role,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can add notes');

    const alert = await this.prisma.interventionAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert) throw new NotFoundException('Intervention alert not found');

    const existingNotes = alert.notes
      ? typeof alert.notes === 'string'
        ? (() => {
            try {
              return JSON.parse(alert.notes);
            } catch {
              return [];
            }
          })()
        : Array.isArray(alert.notes)
          ? alert.notes
          : []
      : [];
    const newNotes = [
      ...existingNotes,
      {
        id: `note_${Date.now()}`,
        text,
        author: 'HOD',
        date: new Date().toISOString(),
      },
    ];

    return this.prisma.interventionAlert.update({
      where: { id: alertId },
      data: { notes: JSON.stringify(newNotes) },
    });
  }
}

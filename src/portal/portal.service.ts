import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  async getPortalData(
    studentId: string,
    requesterId?: string,
    requesterRole?: Role,
  ) {
    let targetStudentId = studentId;

    if (requesterRole === Role.STUDENT && requesterId) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: requesterId },
        select: { id: true },
      });

      if (!student) {
        throw new ForbiddenException('Student profile not found');
      }

      targetStudentId = student.id;
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: targetStudentId },
      include: {
        currentClass: true,
        department: true,
        user: { select: { lastLoginAt: true } },
      },
    });

    const latestReport = await this.prisma.reportCard.findFirst({
      where: { studentId: targetStudentId },
      orderBy: { createdAt: 'desc' },
      include: { term: { include: { academicYear: true } } },
    });

    const attendance = await this.prisma.attendanceRecord.findMany({
      where: { studentId: targetStudentId },
    });

    const notifications = await this.prisma.notification.findMany({
      where: { studentId: targetStudentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const gradeEntries = await this.prisma.gradeEntry.findMany({
      where: { studentId: targetStudentId },
      include: { subject: true, term: { include: { academicYear: true } } },
    });

    const interventions = await this.prisma.interventionAlert.findMany({
      where: {
        studentId: targetStudentId,
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
      },
    });

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
      include: { academicYear: true },
    });

    const attendancePercentage = this.calculateAttendance(attendance);

    const latestBehavior = await this.prisma.studentBehavior.findFirst({
      where: { studentId: targetStudentId },
      orderBy: { createdAt: 'desc' },
    });

    const characterTraits = await this.prisma.characterTrait.findFirst({
      where: { studentId: targetStudentId },
      orderBy: { createdAt: 'desc' },
    });

    const cgpa =
      latestReport?.averageScore != null
        ? this.percentageToGpa(latestReport.averageScore)
        : 0;

    const yearForm = latestReport?.term?.academicYear?.label || activeTerm?.academicYear?.label || '—';
    const semester = latestReport?.term?.termNumber || activeTerm?.termNumber || '—';

    const currentTermGrades = latestReport
      ? gradeEntries.filter((g) => g.termId === latestReport.termId)
      : activeTerm ? gradeEntries.filter((g) => g.termId === activeTerm.id) : [];

    const terminalResults = currentTermGrades.map((g) => ({
      subject: g.subject?.name || 'Unknown',
      caScore: g.classScore ?? 0,
      examScore: g.examScore ?? 0,
      totalScore: g.totalScore ?? (g.classScore ?? 0) + (g.examScore ?? 0),
      grade: g.grade || '-',
      sbaScore: g.classScore ?? 0,
      waecExamScore: g.examScore ?? 0,
      finalScore: g.totalScore ?? (g.classScore ?? 0) + (g.examScore ?? 0),
    }));

    const academicHistory = await this.buildAcademicHistory(
      targetStudentId,
      gradeEntries,
    );

    return {
      student: {
        id: student?.id,
        firstName: student?.firstName,
        lastName: student?.lastName,
        middleName: student?.middleName,
        fullName:
          `${student?.firstName ?? ''} ${student?.lastName ?? ''}`.trim() ||
          undefined,
        dateOfBirth: student?.dateOfBirth,
        gender: student?.gender,
        indexNumber: student?.indexNumber,
        currentClassId: student?.currentClassId,
        currentClass: student?.currentClass,
        department: student?.department,
        user: student?.user,
      },
      cgpa,
      classRank: latestReport?.classPosition,
      approvalStatus: latestReport?.releasedAt ? 'APPROVED' : 'PENDING',
      attendancePercentage,
      yearForm,
      semester,
      sbaScore: latestReport?.averageScore ?? 0,
      waecExamScore: 0,
      finalScore: latestReport?.averageScore ?? 0,
      grade: undefined,
      gpaPerTerm: cgpa,
      terminalResults,
      coreResults: terminalResults.filter((r) =>
        [
          'Core Mathematics',
          'English Language',
          'Integrated Science',
          'Social Studies',
        ].includes(r.subject),
      ),
      technicalResults: terminalResults.filter(
        (r) =>
          ![
            'Core Mathematics',
            'English Language',
            'Integrated Science',
            'Social Studies',
          ].includes(r.subject),
      ),
      academicHistory,
      behaviorRating: latestBehavior?.attitude ?? 0,
      behaviorComments: latestBehavior?.remarks || '',
      behavioralLogs: latestBehavior ? [latestBehavior] : [],
      characterTraits: characterTraits
        ? {
            characterQualities:
              (characterTraits.leadership +
                characterTraits.discipline +
                characterTraits.teamwork +
                characterTraits.ethics) /
                4 || 0,
            leadership: characterTraits.leadership,
            discipline: characterTraits.discipline,
            teamwork: characterTraits.teamwork,
            ethics: characterTraits.ethics,
            communication: characterTraits.communication ?? 0,
            responsibility: characterTraits.responsibility ?? 0,
          }
        : null,
      notifications,
      activeInterventions: interventions,
      wassceResults: [],
      enrollmentDate: student?.admissionDate,
      completionDate: undefined,
      house: undefined,
      terminalExamDate:
        latestReport?.term?.endDate?.toISOString() ??
        activeTerm?.endDate?.toISOString() ??
        latestReport?.generatedAt?.toISOString(),
      learningArea: student?.department?.name || '—',
      programName: student?.currentClass?.name || '—',
      program: student?.department?.name || '—',
      recentResults: gradeEntries,
    };
  }

  private async buildAcademicHistory(studentId: string, gradeEntries: any[]) {
    const reportCards = await this.prisma.reportCard.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' },
      include: { term: { include: { academicYear: true } } },
    });

    if (!reportCards.length) {
      return [];
    }

    const grouped = new Map<string, any[]>();
    for (const entry of gradeEntries) {
      const key = `${entry.termId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(entry);
    }

    return reportCards.map((report) => {
      const termGrades = grouped.get(report.termId) || [];
      return {
        id: report.id,
        year: report.term?.academicYear?.label || '—',
        term: report.term?.termNumber || '—',
        subjects: termGrades.map((g) => ({
          name: g.subject?.name || 'Unknown',
          score: g.totalScore ?? (g.classScore ?? 0) + (g.examScore ?? 0),
          grade: g.grade || '-',
        })),
        approvalStatus: report.releasedAt ? 'APPROVED' : 'PENDING',
      };
    });
  }

  private calculateAttendance(records: any[]) {
    const present = records.reduce((sum, r) => sum + r.daysPresent, 0);
    const total = records.reduce((sum, r) => sum + r.totalDays, 0);

    if (!total) return 0;

    return Number(((present / total) * 100).toFixed(2));
  }

  private percentageToGpa(percentage: number): number {
    if (percentage >= 90) return 4.0;
    if (percentage >= 85) return 3.75;
    if (percentage >= 80) return 3.5;
    if (percentage >= 75) return 3.25;
    if (percentage >= 70) return 3.0;
    if (percentage >= 65) return 2.75;
    if (percentage >= 60) return 2.5;
    if (percentage >= 55) return 2.25;
    if (percentage >= 50) return 2.0;
    if (percentage >= 45) return 1.75;
    if (percentage >= 40) return 1.5;
    if (percentage >= 35) return 1.0;
    if (percentage >= 30) return 0.75;
    if (percentage >= 25) return 0.5;
    return 0.0;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { createHash } from 'crypto';
import * as QRCode from 'qrcode';
import { DocumentType, ClassLevel, NotificationChannel } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Generate report card for a single student in a term.
   * Creates a unique system hash and QR code for authenticity.
   */
  async generateReportCard(studentId: string, termId?: string) {
    // If no termId provided, find the most recent term with grades
    let targetTermId = termId;
    if (!targetTermId) {
      const latestGrade = await this.prisma.gradeEntry.findFirst({
        where: { studentId },
        orderBy: { termId: 'desc' },
        select: { termId: true },
      });
      targetTermId = latestGrade?.termId;
    }

    if (!targetTermId) {
      throw new NotFoundException('No grades found for this student');
    }

    const [student, grades, attendance] = await Promise.all([
      this.prisma.studentProfile.findUniqueOrThrow({
        where: { id: studentId },
        include: { currentClass: true, user: true },
      }),
      this.prisma.gradeEntry.findMany({
        where: { studentId, termId: targetTermId },
        include: { subject: true },
        orderBy: { subject: { name: 'asc' } },
      }),
      this.prisma.attendanceRecord.findFirst({
        where: { studentId, termId: targetTermId },
      }),
    ]);

    if (grades.length === 0) {
      throw new NotFoundException('No grades found for this student/term');
    }

    // Compute statistics
    const totalScore = grades.reduce((s, g) => s + (g.totalScore ?? 0), 0);
    const averageScore = totalScore / grades.length;
    const subjectCount = grades.length;

    // Build canonical content string for hashing
    const canonical = JSON.stringify({
      indexNumber: student.indexNumber,
      termId: targetTermId,
      grades: grades.map((g) => ({
        subject: g.subject.code,
        total: g.totalScore,
        grade: g.grade,
      })),
      averageScore,
      generatedAt: new Date().toISOString().split('T')[0],
    });

    const systemHash = createHash('sha256').update(canonical).digest('hex');
    const verificationUrl = `${this.config.get('QR_BASE_URL')}/verify/${systemHash}`;
    const qrCodeUrl = await QRCode.toDataURL(verificationUrl);

    // Upsert report card
    const reportCard = await this.prisma.reportCard.upsert({
      where: { studentId_termId: { studentId, termId: targetTermId } },
      create: {
        studentId,
        termId: targetTermId,
        documentType: DocumentType.REPORT_CARD,
        systemHash,
        qrCodeUrl,
        verificationUrl,
        totalScore,
        averageScore,
        classSize: 0, // Populated in batch
        generatedAt: new Date(),
      },
      update: {
        systemHash,
        qrCodeUrl,
        verificationUrl,
        totalScore,
        averageScore,
        generatedAt: new Date(),
      },
      include: { student: true, term: { include: { academicYear: true } } },
    });

    return {
      reportCard,
      grades,
      attendance,
      student,
      statistics: { totalScore, averageScore, subjectCount },
    };
  }

  /**
   * Batch generate report cards for an entire class in a term.
   * Returns a job summary (students processed, errors).
   */
  async batchGenerateReportCards(classSectionId: string, termId: string) {
    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: classSectionId },
      select: { id: true, indexNumber: true, firstName: true, lastName: true },
    });

    const results = await Promise.allSettled(
      students.map((s) => this.generateReportCard(s.id, termId)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results
      .map((r, i) => ({ result: r, student: students[i] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ student, result }) => ({
        studentId: student.id,
        indexNumber: student.indexNumber,
        error: (result as PromiseRejectedResult).reason?.message,
      }));

    // Update class positions
    await this.computeClassPositions(classSectionId, termId);

    return {
      total: students.length,
      succeeded,
      failedCount: failed.length,
      failed,
    };
  }

  /**
   * Compute and update class positions for all students in a class/term
   */
  private async computeClassPositions(classSectionId: string, termId: string) {
    const reportCards = await this.prisma.reportCard.findMany({
      where: {
        termId,
        student: { currentClassId: classSectionId },
      },
      orderBy: { averageScore: 'desc' },
    });

    const classSize = reportCards.length;
    let currentRank = 1;

    for (let i = 0; i < reportCards.length; i++) {
      const rc = reportCards[i];

      // Handle ties: if this student has the same score as the previous one, use same rank
      if (i > 0 && rc.averageScore === reportCards[i - 1].averageScore) {
        // rank remains the same
      } else {
        currentRank = i + 1;
      }

      await this.prisma.reportCard.update({
        where: { id: rc.id },
        data: { classPosition: currentRank, classSize },
      });
    }
  }

  /**
   * Build a full 3-year transcript for a student (alumni or current)
   */
  async buildTranscript(studentIdOrIndex: string) {
    // Allow lookup by index number or ID
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [{ id: studentIdOrIndex }, { indexNumber: studentIdOrIndex }],
      },
      include: {
        user: true,
        grades: {
          include: {
            subject: true,
            term: { include: { academicYear: true } },
          },
          orderBy: [
            { term: { academicYear: { startDate: 'asc' } } },
            { term: { termNumber: 'asc' } },
          ],
        },
        reportCards: {
          include: { term: { include: { academicYear: true } } },
          orderBy: { term: { academicYear: { startDate: 'asc' } } },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Build canonical transcript content
    const canonical = JSON.stringify({
      indexNumber: student.indexNumber,
      grades: student.grades.map((g) => ({
        subject: g.subject.code,
        term: g.term.termNumber,
        year: g.term.academicYear.label,
        total: g.totalScore,
        grade: g.grade,
      })),
      generatedAt: new Date().toISOString(),
    });

    const systemHash = createHash('sha256').update(canonical).digest('hex');
    const verificationUrl = `${this.config.get('QR_BASE_URL')}/verify/transcript/${systemHash}`;
    const qrCodeUrl = await QRCode.toDataURL(verificationUrl);

    // Save transcript record
    const transcript = await this.prisma.transcript.create({
      data: {
        studentId: student.id,
        indexNumber: student.indexNumber,
        systemHash,
        qrCodeUrl,
        verificationUrl: verificationUrl,
      },
    });

    return {
      transcript,
      student,
      verificationUrl,
    };
  }

  /**
   * Verify a document by its system hash (QR scan endpoint)
   */
  async verifyDocument(hash: string) {
    const [reportCard, transcript] = await Promise.all([
      this.prisma.reportCard.findUnique({
        where: { systemHash: hash },
        include: {
          student: {
            select: { indexNumber: true, firstName: true, lastName: true },
          },
          term: { include: { academicYear: true } },
        },
      }),
      this.prisma.transcript.findUnique({ where: { systemHash: hash } }),
    ]);

    if (reportCard) {
      return {
        valid: true,
        documentType: 'REPORT_CARD',
        student: reportCard.student,
        term: reportCard.term,
        generatedAt: reportCard.generatedAt,
      };
    }

    if (transcript) {
      return {
        valid: true,
        documentType: 'TRANSCRIPT',
        indexNumber: transcript.indexNumber,
        generatedAt: transcript.generatedAt,
      };
    }

    return { valid: false, message: 'Document not found in system' };
  }

  async getStudentsForGeneration(query: any) {
    const where: any = {};

    if (query.classSectionId) {
      where.currentClassId = query.classSectionId;
    }

    if (query.form) {
      const levelMap: Record<string, ClassLevel> = {
        'SHS 1': ClassLevel.FORM_1,
        'SHS 2': ClassLevel.FORM_2,
        'SHS 3': ClassLevel.FORM_3,
      };
      const level = levelMap[query.form];
      if (level) {
        where.currentClass = { level };
      }
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { indexNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.studentProfile.findMany({
      where,
      select: {
        id: true,
        indexNumber: true,
        firstName: true,
        lastName: true,
        middleName: true,
        currentClass: { select: { id: true, name: true, level: true } },
      },
      orderBy: [{ currentClass: { level: 'asc' } }, { lastName: 'asc' }],
    });
  }

  async getBlockingIssues(classSectionId: string) {
    const issues: Array<{ type: string; message: string; severity: string }> =
      [];

    const classSection = await this.prisma.classSection.findUnique({
      where: { id: classSectionId },
      include: { teachingAssignments: true },
    });

    if (!classSection) {
      return [
        {
          type: 'CLASS_NOT_FOUND',
          message: 'Class section not found',
          severity: 'HIGH',
        },
      ];
    }

    const studentCount = await this.prisma.studentProfile.count({
      where: { currentClassId: classSectionId },
    });

    if (studentCount === 0) {
      issues.push({
        type: 'NO_STUDENTS',
        message: 'No students enrolled in this class',
        severity: 'HIGH',
      });
    }

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
    });

    if (!activeTerm) {
      issues.push({
        type: 'NO_ACTIVE_TERM',
        message: 'No active term found',
        severity: 'HIGH',
      });
    } else {
      if (!activeTerm.isLocked) {
        issues.push({
          type: 'TERM_NOT_LOCKED',
          message: 'Active term is not locked',
          severity: 'MEDIUM',
        });
      }

      const gradeCount = await this.prisma.gradeEntry.count({
        where: {
          student: { currentClassId: classSectionId },
          termId: activeTerm.id,
        },
      });

      const expectedGrades =
        studentCount * (classSection.teachingAssignments.length || 1);
      if (gradeCount < expectedGrades) {
        issues.push({
          type: 'INCOMPLETE_GRADES',
          message: 'Not all grade entries have been recorded for this class',
          severity: 'HIGH',
        });
      }

      const attendanceCount = await this.prisma.attendanceRecord.count({
        where: {
          student: { currentClassId: classSectionId },
          termId: activeTerm.id,
        },
      });

      if (attendanceCount < studentCount) {
        issues.push({
          type: 'MISSING_ATTENDANCE',
          message: 'Not all students have attendance records for this term',
          severity: 'MEDIUM',
        });
      }
    }

    return issues;
  }

  async sendNudgeToTeachers(
    classSectionId: string,
    message?: string,
    userId?: string,
  ) {
    const classSection = await this.prisma.classSection.findUnique({
      where: { id: classSectionId },
      include: {
        teachingAssignments: {
          include: { teacher: true },
        },
      },
    });

    if (!classSection) {
      throw new NotFoundException('Class section not found');
    }

    const teacherIds = [
      ...new Set(
        classSection.teachingAssignments
          .map((ta) => ta.teacher?.id)
          .filter(Boolean),
      ),
    ] as string[];

    const title = 'Reminder: Missing Marks';
    const body =
      message || `Please submit missing marks for class ${classSection.name}`;

    const notifications = await Promise.all(
      teacherIds.map((staffId) =>
        this.prisma.notification.create({
          data: {
            staffId,
            title,
            body,
            channel: NotificationChannel.APP,
            createdById: userId,
          },
        }),
      ),
    );

    return { sent: notifications.length, teacherIds };
  }
}

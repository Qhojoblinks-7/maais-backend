import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class HODExportService {
  private readonly validSubjectCodes = [
    // Core subjects
    302, // English Language
    402, // Mathematics (Core)
    502, // Integrated Science
    204, // Social Studies

    // Science electives
    512, // Physics
    505, // Chemistry
    504, // Biology
    401, // Elective Mathematics
    507, // Agricultural Science
    216, // Geography
    319, // ICT
    608, // Technical Drawing

    // Business electives
    103, // Commerce
    104, // Financial Accounting
    113, // Business Management
    203, // Economics
    114, // Office Practice
    112, // Marketing

    // Arts electives
    210, // Literature in English
    205, // Government
    207, // History
    202, // Christian Religious Studies
    208, // Islamic Religious Studies
    304, // French
    301, // Arabic
    321, // Akan/Fante
    322, // Ewe
    323, // Ga
    324, // Nzema
    325, // Dagbani
    326, // Gonja
    330, // Dagaare
    705, // Music
    706, // Visual Art

    // Technical/Trade electives
    327, // Hausa
    328, // Igbo
    329, // Yoruba

    // Other common subjects
    508, // Health Education
    511, // Physical Education
    702, // Food and Nutrition
    703, // Home Management
  ];

  validateExportData(data: {
    indexNumber: string;
    lastName: string;
    firstName: string;
    dateOfBirth: Date | null;
    gender: string;
    subjectCode: string;
    classScore: number | null;
    examScore: number | null;
  }): string[] {
    const errors: string[] = [];

    if (
      !data.indexNumber ||
      !/^\d{7,10}$/.test(String(data.indexNumber).trim())
    ) {
      errors.push('CandidateNumber must be 7-10 digits');
    }

    if (!data.lastName) {
      errors.push('Surname is required');
    }

    if (!data.firstName) {
      errors.push('OtherNames is required');
    }

    if (!data.dateOfBirth) {
      errors.push('DateOfBirth is required');
    }

    if (!['M', 'F'].includes(String(data.gender).trim().toUpperCase())) {
      errors.push('Gender must be M or F');
    }

    const subjectCode = Number(data.subjectCode);
    if (!data.subjectCode || !this.validSubjectCodes.includes(subjectCode)) {
      errors.push(`Invalid SubjectCode: ${data.subjectCode}`);
    }

    const caScore = data.classScore ?? 0;
    if (caScore < 0 || caScore > 30) {
      errors.push('ContinuousAssessment must be between 0 and 30');
    }

    const exam = data.examScore ?? 0;
    if (exam < 0 || exam > 70) {
      errors.push('ExamScore must be between 0 and 70');
    }

    return errors;
  }

  constructor(private prisma: PrismaService) {}

  private async getDepartmentContext(userId: string, role: Role) {
    if (role === Role.HOD) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { userId },
      });
      if (!staffProfile) throw new ForbiddenException('HOD profile not found');
      return staffProfile.departmentId;
    }
    return null;
  }

  private getGradePoint(grade: string): number {
    const map: Record<string, number> = {
      A1: 4.0,
      B2: 3.5,
      B3: 3.0,
      C4: 2.5,
      C5: 2.0,
      C6: 1.5,
      D7: 1.0,
      E8: 0.5,
      F9: 0.0,
    };
    return map[grade] ?? 0.0;
  }

  async exportWAECCSV(
    termId: string,
    className: string,
    userId: string,
    role: Role,
  ): Promise<string> {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const classSection = await this.prisma.classSection.findFirst({
      where: { name: className },
    });
    if (!classSection) throw new NotFoundException('Class not found');

    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: classSection.id, archivedAt: null },
      include: {
        grades: {
          where: { termId },
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        },
      },
      orderBy: { indexNumber: 'asc' },
    });

    const headers = [
      'CandidateNumber',
      'Surname',
      'OtherNames',
      'DateOfBirth',
      'Gender',
      'SubjectCode',
      'ContinuousAssessment',
      'ExamScore',
    ];

    const rows: { data: any; errors: string[] }[] = [];

    for (const student of students) {
      const subjects = student.grades;

      if (subjects.length === 0) {
        const gender = student.gender === 'FEMALE' ? 'F' : 'M';

        const rowData = {
          indexNumber: student.indexNumber || '',
          lastName: student.lastName || '',
          firstName: student.firstName || '',
          dateOfBirth: student.dateOfBirth,
          gender: gender,
          subjectCode: '',
          classScore: 0,
          examScore: 0,
        };

        rows.push({
          data: rowData,
          errors: this.validateExportData(rowData),
        });
      }

      for (const g of subjects) {
        const sba = g.classScore ?? 0;
        const exam = g.examScore ?? 0;
        const gender = student.gender === 'FEMALE' ? 'F' : 'M';
        const subjectCode = g.subject?.code || '';

        const rowData = {
          indexNumber: student.indexNumber || '',
          lastName: student.lastName || '',
          firstName: student.firstName || '',
          dateOfBirth: student.dateOfBirth,
          gender: gender,
          subjectCode: subjectCode,
          classScore: sba,
          examScore: exam,
        };

        rows.push({
          data: rowData,
          errors: this.validateExportData(rowData),
        });
      }
    }

    const hasValidationErrors = rows.some((r) => r.errors.length > 0);
    if (hasValidationErrors) {
      const allErrors = rows
        .filter((r) => r.errors.length > 0)
        .map((r, i) => ({ row: i + 2, issues: r.errors }));
      throw new ForbiddenException(
        `CSV validation failed: ${JSON.stringify(allErrors)}`,
      );
    }

    const csvRows = rows.map((r) =>
      [
        r.data.indexNumber,
        r.data.lastName,
        r.data.firstName,
        r.data.dateOfBirth
          ? new Date(r.data.dateOfBirth).toISOString().split('T')[0]
          : '',
        r.data.gender,
        r.data.subjectCode,
        r.data.classScore.toFixed(0),
        r.data.examScore.toFixed(0),
      ]
        .map((f) => `"${String(f).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [headers.join(','), ...csvRows].join('\r\n');
  }

  async exportDepartmentWAECCSV(
    termId: string,
    userId: string,
    role: Role,
  ): Promise<string> {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const departmentId = await this.getDepartmentContext(userId, role);
    if (!departmentId)
      throw new ForbiddenException('Department context required');

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId },
      select: { id: true, name: true, code: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subjectId: { in: subjectIds } },
      select: { classSectionId: true },
    });
    const classIds = [
      ...new Set(teachingAssignments.map((ta) => ta.classSectionId)),
    ];

    const students = await this.prisma.studentProfile.findMany({
      where: {
        currentClassId: { in: classIds },
        archivedAt: null,
      },
      include: {
        grades: {
          where: { termId, subjectId: { in: subjectIds } },
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        },
        currentClass: true,
      },
      orderBy: [
        { currentClass: { name: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    const headers = [
      'CandidateNumber',
      'Surname',
      'OtherNames',
      'DateOfBirth',
      'Gender',
      'SubjectCode',
      'ContinuousAssessment',
      'ExamScore',
    ];

    const rows: { data: any; errors: string[] }[] = [];

    for (const student of students) {
      const subjects = student.grades;

      if (subjects.length === 0) {
        const gender = student.gender === 'FEMALE' ? 'F' : 'M';

        const rowData = {
          indexNumber: student.indexNumber || '',
          lastName: student.lastName || '',
          firstName: student.firstName || '',
          dateOfBirth: student.dateOfBirth,
          gender: gender,
          subjectCode: '',
          classScore: 0,
          examScore: 0,
        };

        rows.push({
          data: rowData,
          errors: this.validateExportData(rowData),
        });
      }

      for (const g of subjects) {
        const sba = g.classScore ?? 0;
        const exam = g.examScore ?? 0;
        const gender = student.gender === 'FEMALE' ? 'F' : 'M';
        const subjectCode = g.subject?.code || '';

        const rowData = {
          indexNumber: student.indexNumber || '',
          lastName: student.lastName || '',
          firstName: student.firstName || '',
          dateOfBirth: student.dateOfBirth,
          gender: gender,
          subjectCode: subjectCode,
          classScore: sba,
          examScore: exam,
        };

        rows.push({
          data: rowData,
          errors: this.validateExportData(rowData),
        });
      }
    }

    const hasValidationErrors = rows.some((r) => r.errors.length > 0);
    if (hasValidationErrors) {
      const allErrors = rows
        .filter((r) => r.errors.length > 0)
        .map((r, i) => ({ row: i + 2, issues: r.errors }));
      throw new ForbiddenException(
        `CSV validation failed: ${JSON.stringify(allErrors)}`,
      );
    }

    const csvRows = rows.map((r) =>
      [
        r.data.indexNumber,
        r.data.lastName,
        r.data.firstName,
        r.data.dateOfBirth
          ? new Date(r.data.dateOfBirth).toISOString().split('T')[0]
          : '',
        r.data.gender,
        r.data.subjectCode,
        r.data.classScore.toFixed(0),
        r.data.examScore.toFixed(0),
      ]
        .map((f) => `"${String(f).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [headers.join(','), ...csvRows].join('\r\n');
  }

  async exportWAECPDF(
    termId: string,
    className: string,
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const classSection = await this.prisma.classSection.findFirst({
      where: { name: className },
    });
    if (!classSection) throw new NotFoundException('Class not found');

    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: classSection.id, archivedAt: null },
      include: {
        grades: {
          where: { termId },
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        },
      },
      orderBy: { indexNumber: 'asc' },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    let y = pageHeight - margin;

    const drawText = (
      text: string,
      x: number,
      size: number,
      fontRef: any,
      align: 'left' | 'center' | 'right' = 'left',
    ) => {
      const textWidth = fontRef.widthOfTextAtSize(text, size);
      if (align === 'center') x = (pageWidth - textWidth) / 2;
      if (align === 'right') x = pageWidth - margin - textWidth;
      page.drawText(text, { x, y, size, font: fontRef, color: rgb(0, 0, 0) });
    };

    const drawLine = (yPos: number, thickness = 0.5) => {
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness,
        color: rgb(0, 0, 0),
      });
    };

    const addPage = () => {
      drawLine(y, 1);
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = newPage.getHeight() - margin;

      drawText(
        'MAAIS - WAEC STP Compliant Result Slip',
        pageWidth / 2,
        16,
        boldFont,
        'center',
      );
      y -= 22;
      drawLine(y);
      y -= 18;

      const colX = [
        margin,
        margin + 50,
        margin + 115,
        margin + 280,
        margin + 335,
        margin + 385,
        margin + 435,
        pageWidth - margin,
      ];
      [
        'Index',
        'Student Name',
        'Sex',
        'Subject',
        'SBA',
        'Exam',
        'Final',
        'Grade',
      ].forEach((h, i) => {
        drawText(h, colX[i], 11, boldFont);
      });
      y -= 14;
      drawLine(y);
      y -= 12;
      return newPage;
    };

    const needsNewPage = (required: number) => {
      if (y - required < margin + 30) {
        addPage();
      }
    };

    // Document header - WAEC style
    drawText('MINISTRY OF EDUCATION', pageWidth / 2, 14, font, 'center');
    y -= 18;
    drawText(
      'WEST AFRICAN EXAMINATION COUNCIL',
      pageWidth / 2,
      16,
      boldFont,
      'center',
    );
    y -= 22;
    drawText(
      'STUDENT TRANSCRIPT PORTAL (STP) — TERM RESULT SLIP',
      pageWidth / 2,
      13,
      boldFont,
      'center',
    );
    y -= 24;
    drawLine(y, 1);
    y -= 18;

    // Meta block
    drawText(`Academic Year: 2025/2026`, margin, 11, font);
    drawText(`Term: 1`, margin + 180, 11, font);
    drawText(`Class: ${className}`, margin + 320, 11, font);
    drawText(
      `Generated: ${new Date().toLocaleDateString()}`,
      margin + 460,
      11,
      font,
    );
    y -= 22;
    drawLine(y);
    y -= 16;

    // Column headers
    const colX = [
      margin,
      margin + 50,
      margin + 115,
      margin + 280,
      margin + 335,
      margin + 385,
      margin + 435,
      pageWidth - margin,
    ];
    [
      'Index',
      'Student Name',
      'Sex',
      'Subject',
      'SBA',
      'Exam',
      'Final',
      'Grade',
    ].forEach((h, i) => {
      drawText(h, colX[i], 11, boldFont);
    });
    y -= 14;
    drawLine(y);
    y -= 12;

    let globalIndex = 0;
    let lastStudentId = '';

    for (const student of students) {
      const sex = student.gender === 'FEMALE' ? 'F' : 'M';
      const grades = student.grades.length > 0 ? student.grades : [null];

      for (let gi = 0; gi < grades.length; gi++) {
        const g = grades[gi];
        const isNewStudent = student.id !== lastStudentId;
        lastStudentId = student.id;

        needsNewPage(18);

        const name = isNewStudent
          ? `${student.lastName}, ${student.firstName}`.substring(0, 22)
          : '';
        const idx = isNewStudent ? student.indexNumber || '' : '';

        drawText(idx, colX[0], 10, font);
        drawText(name, colX[1], 10, font);
        drawText(isNewStudent ? sex : '', colX[2], 10, font);
        drawText((g?.subject?.name || '').substring(0, 20), colX[3], 10, font);
        drawText((g?.classScore ?? 0).toFixed(0), colX[4], 10, font);
        drawText((g?.examScore ?? 0).toFixed(0), colX[5], 10, font);
        drawText((g?.totalScore ?? 0).toFixed(0), colX[6], 10, font);
        drawText(g?.grade || 'F9', colX[7], 10, font);

        y -= 14;
        globalIndex++;
      }
    }

    // Summary block
    y -= 14;
    drawLine(y);
    y -= 16;
    drawText(
      `Total Students: ${students.length}    Total Entries: ${globalIndex}`,
      margin,
      10,
      font,
    );
    y -= 14;
    drawText(
      `Computed per WAEC STP schema: SBA (30%) + Exam (70%) = Final Score (0–100)`,
      margin,
      10,
      font,
    );
    y -= 14;
    drawText(
      'HOD Certification: _____________________________    Date: _______________',
      margin,
      10,
      font,
    );

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  async exportDepartmentWAECPDF(termId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const departmentId = await this.getDepartmentContext(userId, role);
    if (!departmentId)
      throw new ForbiddenException('Department context required');

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId },
      select: { id: true, name: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subjectId: { in: subjectIds } },
      select: { classSectionId: true },
    });
    const classIds = [
      ...new Set(teachingAssignments.map((ta) => ta.classSectionId)),
    ];

    const students = await this.prisma.studentProfile.findMany({
      where: {
        currentClassId: { in: classIds },
        archivedAt: null,
      },
      include: {
        grades: {
          where: { termId, subjectId: { in: subjectIds } },
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        },
        currentClass: true,
      },
      orderBy: [
        { currentClass: { name: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    let y = pageHeight - margin;

    const drawText = (
      text: string,
      x: number,
      size: number,
      fontRef: any,
      align: 'left' | 'center' | 'right' = 'left',
    ) => {
      const textWidth = fontRef.widthOfTextAtSize(text, size);
      if (align === 'center') x = (pageWidth - textWidth) / 2;
      if (align === 'right') x = pageWidth - margin - textWidth;
      page.drawText(text, { x, y, size, font: fontRef, color: rgb(0, 0, 0) });
    };

    const drawLine = (yPos: number, thickness = 0.5) => {
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness,
        color: rgb(0, 0, 0),
      });
    };

    const addPage = () => {
      drawLine(y, 1);
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = newPage.getHeight() - margin;

      drawText(
        'MAAIS - WAEC STP Compliant Department Consolidated Result Sheet',
        pageWidth / 2,
        14,
        boldFont,
        'center',
      );
      y -= 20;
      drawLine(y);
      y -= 16;

      const colX = [
        margin,
        margin + 50,
        margin + 105,
        margin + 160,
        margin + 220,
        margin + 278,
        margin + 336,
        pageWidth - margin,
      ];
      [
        'Index',
        'Student Name',
        'Class',
        'Subject',
        'SBA',
        'Exam',
        'Final',
        'Grade',
      ].forEach((h, i) => {
        drawText(h, colX[i], 10, boldFont);
      });
      y -= 14;
      drawLine(y);
      y -= 12;
      return newPage;
    };

    const needsNewPage = (required: number) => {
      if (y - required < margin + 30) {
        addPage();
      }
    };

    // Document header - WAEC style
    drawText('MINISTRY OF EDUCATION', pageWidth / 2, 14, font, 'center');
    y -= 18;
    drawText(
      'WEST AFRICAN EXAMINATION COUNCIL',
      pageWidth / 2,
      16,
      boldFont,
      'center',
    );
    y -= 22;
    drawText(
      'STUDENT TRANSCRIPT PORTAL (STP) — DEPARTMENT CONSOLIDATED RESULT SHEET',
      pageWidth / 2,
      13,
      boldFont,
      'center',
    );
    y -= 24;
    drawLine(y, 1);
    y -= 18;

    const departmentName = departmentSubjects[0]?.name || 'Department';
    drawText(`Department: ${departmentName}`, margin, 11, font);
    drawText(`Term: 1`, margin + 200, 11, font);
    drawText(
      `Generated: ${new Date().toLocaleDateString()}`,
      margin + 360,
      11,
      font,
    );
    y -= 20;
    drawLine(y);
    y -= 16;

    const colX = [
      margin,
      margin + 50,
      margin + 105,
      margin + 160,
      margin + 220,
      margin + 278,
      margin + 336,
      pageWidth - margin,
    ];
    [
      'Index',
      'Student Name',
      'Class',
      'Subject',
      'SBA',
      'Exam',
      'Final',
      'Grade',
    ].forEach((h, i) => {
      drawText(h, colX[i], 10, boldFont);
    });
    y -= 14;
    drawLine(y);
    y -= 12;

    let globalIndex = 0;

    for (const student of students) {
      const grades = student.grades.length > 0 ? student.grades : [null];

      for (let gi = 0; gi < grades.length; gi++) {
        const g = grades[gi];
        const isNewStudent = gi === 0;

        needsNewPage(16);

        const name = isNewStudent
          ? `${student.lastName}, ${student.firstName}`.substring(0, 22)
          : '';
        const idx = isNewStudent ? student.indexNumber || '' : '';
        const cls = isNewStudent ? student.currentClass?.name || '' : '';

        drawText(idx, colX[0], 10, font);
        drawText(name, colX[1], 10, font);
        drawText(cls, colX[2], 10, font);
        drawText((g?.subject?.name || '').substring(0, 20), colX[3], 10, font);
        drawText((g?.classScore ?? 0).toFixed(0), colX[4], 10, font);
        drawText((g?.examScore ?? 0).toFixed(0), colX[5], 10, font);
        drawText((g?.totalScore ?? 0).toFixed(0), colX[6], 10, font);
        drawText(g?.grade || 'F9', colX[7], 10, font);

        y -= 14;
        globalIndex++;
      }
    }

    // Summary
    y -= 14;
    drawLine(y);
    y -= 16;
    drawText(
      `Total Students: ${students.length}    Total Entries: ${globalIndex}`,
      margin,
      10,
      font,
    );
    y -= 14;
    drawText(
      'Consolidated per WAEC STP department export schema. HOD sign-off required.',
      margin,
      10,
      font,
    );
    y -= 14;
    drawText(
      'HOD Certification: _____________________________    Date: _______________',
      margin,
      10,
      font,
    );

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }
}

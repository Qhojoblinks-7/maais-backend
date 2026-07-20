import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TermNumber, ClassLevel, SubjectType } from '@prisma/client';

@Injectable()
export class AcademicArchitectService {
  private readonly validSubjectCodes = [
    302,
    402,
    502,
    204, // Core
    512,
    505,
    504,
    401,
    507,
    319,
    608, // Science electives
    103,
    104,
    113,
    203,
    114,
    112, // Business electives
    210,
    205,
    207,
    202,
    208,
    304,
    301,
    321,
    322,
    323,
    324,
    325,
    326,
    330,
    705,
    706, // Arts electives
    327,
    328,
    329, // Languages
    216,
    508,
    511,
    702,
    703, // Other
  ];

  constructor(private prisma: PrismaService) {}

  validateSubjectCode(code: string): boolean {
    const numericCode = Number(code);
    return this.validSubjectCodes.includes(numericCode);
  }

  // ─── Academic Years ───────────────────────────────────

  async createAcademicYear(
    label: string,
    startDate: Date,
    endDate: Date,
    termSystem?: string,
  ) {
    const system =
      termSystem === 'TWO_SEMESTERS' ? 'TWO_SEMESTERS' : 'THREE_TERMS';
    const yearStart = new Date(startDate);
    const yearEnd = new Date(endDate);

    const terms =
      system === 'TWO_SEMESTERS'
        ? this.buildSemesters(yearStart, yearEnd)
        : this.buildTerms(yearStart, yearEnd);

    return this.prisma.academicYear.create({
      data: {
        label,
        startDate: yearStart,
        endDate: yearEnd,
        termSystem: system,
        terms: {
          create: terms.map((t, idx) => ({
            ...t,
            isActive: idx === 0,
          })),
        },
      },
      include: { terms: { orderBy: { termNumber: 'asc' } } },
    });
  }

  private splitRange(start: Date, end: Date, parts: number) {
    const total = end.getTime() - start.getTime();
    const step = total / parts;
    const bounds: Date[] = [new Date(start)];
    for (let i = 1; i < parts; i++)
      bounds.push(new Date(start.getTime() + step * i));
    bounds.push(new Date(end));
    const segments = [];
    for (let i = 0; i < parts; i++) {
      segments.push({
        start: new Date(bounds[i]),
        end: new Date(bounds[i + 1]),
      });
    }
    return segments;
  }

  private buildTerms(yearStart: Date, yearEnd: Date) {
    return this.splitRange(yearStart, yearEnd, 3).map((seg, idx) => ({
      termNumber: `TERM_${idx + 1}` as TermNumber,
      startDate: seg.start,
      endDate: seg.end,
    }));
  }

  private buildSemesters(yearStart: Date, yearEnd: Date) {
    return this.splitRange(yearStart, yearEnd, 2).map((seg, idx) => ({
      termNumber: `SEMESTER_${idx + 1}` as TermNumber,
      startDate: seg.start,
      endDate: seg.end,
    }));
  }

  async setActiveYear(yearId: string) {
    await this.prisma.academicYear.updateMany({ data: { isActive: false } });
    return this.prisma.academicYear.update({
      where: { id: yearId },
      data: { isActive: true },
    });
  }

  async getActiveYear() {
    return this.prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { terms: { orderBy: { termNumber: 'asc' } } },
    });
  }

  async getAllYears() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  // ─── Terms ─────────────────────────────────────────────

  async createTerm(
    academicYearId: string,
    termNumber: TermNumber,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.term.create({
      data: { academicYearId, termNumber, startDate, endDate },
    });
  }

  async setActiveTerm(termId: string) {
    // Deactivate current active term in same year first
    const term = await this.prisma.term.findUniqueOrThrow({
      where: { id: termId },
    });
    await this.prisma.term.updateMany({
      where: { academicYearId: term.academicYearId },
      data: { isActive: false },
    });
    return this.prisma.term.update({
      where: { id: termId },
      data: { isActive: true },
    });
  }

  async deactivateTerm(termId: string) {
    return this.prisma.term.update({
      where: { id: termId },
      data: { isActive: false },
    });
  }

  // ─── Departments ──────────────────────────────────────

  async createDepartment(name: string, code: string, description?: string) {
    return this.prisma.department.create({ data: { name, code, description } });
  }

  async getAllDepartments() {
    return this.prisma.department.findMany({
      include: {
        staff: {
          include: {
            user: {
              select: { id: true, email: true, role: true, isActive: true },
            },
            teachingAssignments: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        subjects: {
          include: {
            teachingAssignments: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    staffId: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { staff: true, subjects: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getDepartmentById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        staff: {
          include: {
            user: {
              select: { id: true, email: true, role: true, isActive: true },
            },
            teachingAssignments: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        subjects: {
          include: {
            teachingAssignments: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    staffId: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { staff: true, subjects: true } },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }

    return department;
  }

  // ─── Subjects ─────────────────────────────────────────

  async createSubject(dto: {
    name: string;
    code: string;
    type: SubjectType;
    departmentId?: string;
    description?: string;
  }) {
    if (!this.validateSubjectCode(dto.code)) {
      throw new BadRequestException(
        `Invalid WAEC subject code: ${dto.code}. Must be one of: ${this.validSubjectCodes.join(', ')}`,
      );
    }
    return this.prisma.subject.create({ data: dto });
  }

  async getAllSubjects() {
    return this.prisma.subject.findMany({
      where: { isActive: true },
      include: { department: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Class Sections ───────────────────────────────────

  async createClassSection(
    name: string,
    level: ClassLevel,
    capacity?: number,
    program?: string,
    track?: string,
  ) {
    return this.prisma.classSection.create({
      data: { name, level, capacity, program, track },
    });
  }

  async getAllClassSections(track?: string) {
    return this.prisma.classSection.findMany({
      where: track ? { track } : undefined,
      include: {
        classTeacher: true,
        _count: { select: { students: true } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  async assignClassTeacher(classSectionId: string, staffId: string) {
    return this.prisma.classSection.update({
      where: { id: classSectionId },
      data: { classTeacherId: staffId },
    });
  }

  async updateClassSection(
    classSectionId: string,
    data: {
      name?: string;
      level?: ClassLevel;
      capacity?: number;
      program?: string;
    },
  ) {
    return this.prisma.classSection.update({
      where: { id: classSectionId },
      data,
    });
  }

  async deleteClassSection(classSectionId: string) {
    return this.prisma.classSection.delete({
      where: { id: classSectionId },
    });
  }

  // ─── Teaching Assignments ──────────────────────────────

  async assignTeacher(dto: {
    teacherId: string;
    subjectId: string;
    classSectionId: string;
    academicYearId: string;
  }) {
    return this.prisma.teachingAssignment.create({ data: dto });
  }

  async getTeacherAssignments(teacherId: string) {
    return this.prisma.teachingAssignment.findMany({
      where: { teacherId },
      include: { subject: true, classSection: true },
    });
  }

  async getAssignmentsByClass(classSectionId: string, track?: string) {
    return this.prisma.teachingAssignment.findMany({
      where: {
        classSectionId,
        ...(track ? { classSection: { track } } : {}),
      },
      include: {
        subject: { include: { department: true } },
        teacher: { include: { user: { select: { email: true } } } },
        classSection: true,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TermNumber, ClassLevel, SubjectType } from '@prisma/client';

@Injectable()
export class AcademicArchitectService {
  constructor(private prisma: PrismaService) {}

  // ─── Academic Years ───────────────────────────────────

  async createAcademicYear(label: string, startDate: Date, endDate: Date) {
    return this.prisma.academicYear.create({
      data: { label, startDate, endDate },
    });
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

  // ─── Terms ────────────────────────────────────────────

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
          },
        },
        subjects: true,
        _count: { select: { staff: true, subjects: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Subjects ─────────────────────────────────────────

  async createSubject(dto: {
    name: string;
    code: string;
    type: SubjectType;
    departmentId?: string;
    description?: string;
  }) {
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

async createClassSection(name: string, level: ClassLevel, capacity?: number, program?: string, track?: string) {
      return this.prisma.classSection.create({ data: { name, level, capacity, program, track } });
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

  // ─── Teaching Assignments ─────────────────────────────

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
        where: { classSectionId },
        include: {
          subject: { include: { department: true } },
          teacher: { include: { user: { select: { email: true } } } },
          classSection: true,
        },
      });
    }
}

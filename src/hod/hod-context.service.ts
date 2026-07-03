import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class HODContextService {
  constructor(private prisma: PrismaService) {}

  async getContext(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: { department: true },
    });

    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: staffProfile.id },
      include: { subject: true, classSection: true },
    });

    return {
      hodDepartmentId: staffProfile.departmentId,
      canTeach: teachingAssignments.length > 0,
      canOversight: true,
      teachingAssignmentIds: teachingAssignments.map((a) => a.id),
      departmentName: staffProfile.department?.name || null,
    };
  }

  async getAllAcademicYears(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        label: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });
  }

  async getDepartmentProgress(
    userId: string,
    role: Role,
    page = 1,
    limit = 50,
    academicYearId?: string,
    termNumber?: string,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    let targetTerm = null;
    if (academicYearId && termNumber) {
      targetTerm = await this.prisma.term.findFirst({
        where: {
          academicYearId,
          termNumber: termNumber as any,
        },
      });
    }
    if (!targetTerm) {
      targetTerm = await this.prisma.term.findFirst({
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
      });
    }

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId: staffProfile.departmentId },
      select: { id: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subjectId: { in: subjectIds } },
      include: { classSection: true },
    });

    const classMap = new Map<
      string,
      { id: string; name: string; level: string }
    >();
    teachingAssignments.forEach((ta) => {
      if (!classMap.has(ta.classSectionId)) {
        classMap.set(ta.classSectionId, {
          id: ta.classSection.id,
          name: ta.classSection.name,
          level: ta.classSection.level,
        });
      }
    });

    const departmentClasses = Array.from(classMap.values());
    const startIndex = (page - 1) * limit;
    const paginatedClasses = departmentClasses.slice(
      startIndex,
      startIndex + limit,
    );

    const items = await Promise.all(
      paginatedClasses.map(async (classSection) => {
        const students = await this.prisma.studentProfile.findMany({
          where: { currentClassId: classSection.id, archivedAt: null },
          select: { id: true },
        });
        const studentIds = students.map((s) => s.id);

        let progress = 0;
        let isTermLocked = false;
        let isClassFullyLocked = false;
        if (targetTerm && studentIds.length > 0) {
          const [approvedCount, lockedCount, totalEntriesCount] =
            await Promise.all([
              this.prisma.gradeEntry.count({
                where: {
                  studentId: { in: studentIds },
                  termId: targetTerm.id,
                  subjectId: { in: subjectIds },
                  isApproved: true,
                },
              }),
              this.prisma.gradeEntry.count({
                where: {
                  studentId: { in: studentIds },
                  termId: targetTerm.id,
                  subjectId: { in: subjectIds },
                  isLocked: true,
                },
              }),
              this.prisma.gradeEntry.count({
                where: {
                  studentId: { in: studentIds },
                  termId: targetTerm.id,
                  subjectId: { in: subjectIds },
                },
              }),
            ]);
          const totalCount = subjectIds.length * studentIds.length;
          progress =
            totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
          isClassFullyLocked =
            totalEntriesCount > 0 && lockedCount === totalEntriesCount;
        }

        if (targetTerm) {
          const term = await this.prisma.term.findUnique({
            where: { id: targetTerm.id },
            select: { isLocked: true },
          });
          isTermLocked = term?.isLocked ?? false;
        }

        return {
          id: classSection.id,
          className: classSection.name,
          level: classSection.level,
          studentCount: students.length,
          progress,
          submissionPct: progress,
          status:
            isClassFullyLocked || isTermLocked
              ? 'LOCKED'
              : progress === 100
                ? 'COMPLETE'
                : 'PENDING',
          termId: targetTerm?.id || null,
          checks: [
            { pass: progress > 0, label: 'Grade entries recorded' },
            { pass: progress === 100, label: 'Complete grade submission' },
          ],
        };
      }),
    );

    return {
      items,
      total: departmentClasses.length,
      page,
      limit,
      pages: Math.ceil(departmentClasses.length / limit),
    };
  }
}

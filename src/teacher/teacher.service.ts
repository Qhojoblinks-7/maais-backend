import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  async getClasses(
    teacherId: string,
    requester: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { id: teacherId },
    });

    if (!staffProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    if (
      requester.role === Role.TEACHER &&
      requester.staffProfile?.id !== teacherId &&
      requester.id !== staffProfile.userId
    ) {
      throw new ForbiddenException('You can only access your own classes');
    }

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId },
      include: {
        subject: { include: { department: true } },
        classSection: {
          include: {
            classTeacher: true,
          },
        },
      },
      orderBy: [
        { classSection: { level: 'asc' } },
        { classSection: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return Promise.all(
      assignments.map(async (assignment) => {
        const students = await this.prisma.studentProfile.findMany({
          where: {
            currentClassId: assignment.classSectionId,
            archivedAt: null,
          },
          select: { id: true },
        });

        const studentIds = students.map((student) => student.id);
        const grades = activeTerm
          ? await this.prisma.gradeEntry.findMany({
              where: {
                studentId: { in: studentIds },
                subjectId: assignment.subjectId,
                termId: activeTerm.id,
              },
              select: { totalScore: true },
            })
          : [];

        const completed = grades.filter(
          (grade) => grade.totalScore !== null,
        ).length;
        const studentCount = studentIds.length;
        const progress =
          studentCount > 0 ? Math.round((completed / studentCount) * 100) : 0;

        return {
          id: assignment.id,
          subject: assignment.subject.name,
          subjectCode: assignment.subject.code,
          className: assignment.classSection.name,
          classId: assignment.classSection.id,
          level: assignment.classSection.level,
          studentCount,
          progress,
          status:
            progress === 100
              ? 'COMPLETE'
              : progress > 0
                ? 'IN PROGRESS'
                : 'NOT STARTED',
          color: this.getColor(
            assignment.subject.code || assignment.subject.name,
          ),
          department: assignment.subject.department?.name || null,
          academicYearId: assignment.academicYearId,
        };
      }),
    );
  }

  private getColor(seed: string) {
    const input = seed || 'subject';
    let hash = 0;

    for (let i = 0; i < input.length; i += 1) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 78% 41%)`;
  }
}

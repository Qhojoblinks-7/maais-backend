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
    try {
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
    } catch (error) {
      console.error('[TeacherService] getClasses error:', error);
      throw error;
    }
  }

  async getAnalytics(
    teacherId: string,
    requester: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    try {
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
        throw new ForbiddenException('You can only access your own analytics');
      }

      const activeTerm = await this.prisma.term.findFirst({
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
      });

      const assignments = await this.prisma.teachingAssignment.findMany({
        where: { teacherId },
        include: {
          subject: true,
          classSection: true,
        },
        orderBy: [
          { classSection: { level: 'asc' } },
          { classSection: { name: 'asc' } },
          { subject: { name: 'asc' } },
        ],
      });

      const classProgress = await Promise.all(
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
            (grade) => typeof grade.totalScore === 'number',
          ).length;
          const averageScore = completed
            ? Math.round(
                grades.reduce(
                  (sum, grade) => sum + (grade.totalScore || 0),
                  0,
                ) / completed,
              )
            : 0;

          return {
            subject: assignment.subject.name,
            className: assignment.classSection.name,
            students: studentIds.length,
            completions: completed,
            avgScore: averageScore,
          };
        }),
      );

      const studentScores: any[] = [];
      const observations: any[] = [];

      await Promise.all(
        assignments.map(async (assignment) => {
          const students = await this.prisma.studentProfile.findMany({
            where: {
              currentClassId: assignment.classSectionId,
              archivedAt: null,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              indexNumber: true,
            },
          });

          const studentIds = students.map((student) => student.id);
          const grades = activeTerm
            ? await this.prisma.gradeEntry.findMany({
                where: {
                  studentId: { in: studentIds },
                  subjectId: assignment.subjectId,
                  termId: activeTerm.id,
                },
                select: {
                  id: true,
                  totalScore: true,
                  remark: true,
                  observationText: true,
                  updatedAt: true,
                  student: true,
                },
              })
            : [];

          grades.forEach((grade) => {
            const student = grade.student;
            const score =
              typeof grade.totalScore === 'number' ? Math.round(grade.totalScore) : 0;
            const studentName = [student.firstName, student.lastName]
              .filter(Boolean)
              .join(' ');
            const date = grade.updatedAt.toISOString().slice(0, 10);
            const status =
              typeof grade.totalScore === 'number' ? 'Active' : 'Pending';
            const observation = {
              id: grade.id,
              student: studentName || 'Unknown Student',
              class: assignment.classSection.name,
              index: student.indexNumber,
              type: assignment.subject.name,
              comment: grade.remark || grade.observationText || 'Grade entry pending observation',
              date,
              status,
            };

            studentScores.push({
              id: grade.id,
              student: observation.student,
              class: assignment.classSection.name,
              index: student.indexNumber,
              score,
              trend: '0',
              trendUp: true,
              type: assignment.subject.name,
              status,
            });
            observations.push(observation);
          });
        }),
      );

      const termTrends = activeTerm
        ? classProgress.map((progress) => ({
            term: activeTerm.termNumber,
            avg: progress.avgScore,
          }))
        : [];

      return {
        observations,
        classProgress,
        studentScores,
        termTrends,
      };
    } catch (error) {
      console.error('[TeacherService] getAnalytics error:', error);
      throw error;
    }
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

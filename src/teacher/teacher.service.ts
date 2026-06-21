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
          (grade) => typeof grade.totalScore === 'number',
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
              typeof grade.totalScore === 'number'
                ? Math.round(grade.totalScore)
                : 0;
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
              comment:
                grade.remark ||
                grade.observationText ||
                'Grade entry pending observation',
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

  async getGradeRevisions(teacherId: string) {
    const revisions = await this.prisma.gradeRevision.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });

    const transformed = await Promise.all(
      revisions.map(async (r) => {
        const student = await this.prisma.studentProfile.findUnique({
          where: { id: r.studentId },
          select: { firstName: true, lastName: true, indexNumber: true, currentClass: { select: { name: true } } },
        });
        const subject = await this.prisma.subject.findUnique({
          where: { id: r.subjectId },
          select: { name: true },
        });
        return {
          id: r.id,
          student: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          index: student?.indexNumber || '',
          class: student?.currentClass?.name || 'Unknown',
          subject: subject?.name || 'Unknown',
          issue: r.issue,
          severity: r.severity,
          status: r.status,
          time: r.createdAt.toISOString(),
          history: r.history || [],
        };
      })
    );

    return transformed;
  }

  async submitGradeRevision(body: { gradeEntryId: string; issue: string; severity: string }, teacherId: string) {
    const gradeEntry = await this.prisma.gradeEntry.findUnique({
      where: { id: body.gradeEntryId },
      include: { student: { include: { currentClass: true } }, subject: true },
    });

    if (!gradeEntry) {
      throw new Error('Grade entry not found');
    }

    return this.prisma.gradeRevision.create({
      data: {
        teacherId,
        studentId: gradeEntry.studentId,
        subjectId: gradeEntry.subjectId,
        gradeEntryId: body.gradeEntryId,
        className: gradeEntry.student.currentClass?.name,
        issue: body.issue,
        severity: body.severity,
        status: 'AWAITING_APPROVAL',
        history: [],
      },
    });
  }

  async updateGradeRevision(revisionId: string, body: { status?: string; history?: any }, teacherId: string) {
    const revision = await this.prisma.gradeRevision.findUnique({
      where: { id: revisionId },
    });

    if (!revision) {
      throw new Error('Revision not found');
    }

    const updated = await this.prisma.gradeRevision.update({
      where: { id: revisionId },
      data: {
        status: body.status || revision.status,
        history: body.history !== undefined ? body.history : revision.history,
      },
    });

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: updated.studentId },
      select: { firstName: true, lastName: true, indexNumber: true, currentClass: { select: { name: true } } },
    });
    const subject = await this.prisma.subject.findUnique({
      where: { id: updated.subjectId },
      select: { name: true },
    });

    return {
      id: updated.id,
      student: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      index: student?.indexNumber || '',
      class: updated.className || student?.currentClass?.name || 'Unknown',
      subject: subject?.name || 'Unknown',
      issue: updated.issue,
      severity: updated.severity,
      status: updated.status,
      time: updated.createdAt.toISOString(),
      history: updated.history || [],
    };
  }

  async getGradingIds(subjectName: string, className: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { name: subjectName },
      select: { id: true, name: true },
    });

    const classSection = await this.prisma.classSection.findFirst({
      where: { name: className },
      select: { id: true, name: true },
    });

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true, termNumber: true },
    });

    const term = activeTerm || await this.prisma.term.findFirst({
      orderBy: { startDate: 'desc' },
      select: { id: true, termNumber: true },
    });

    if (!subject || !classSection || !term) {
      return {
        subjectId: subject?.id || null,
        classId: classSection?.id || null,
        termId: term?.id || null,
      };
    }

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      classId: classSection.id,
      className: classSection.name,
      termId: term.id,
      termNumber: term.termNumber,
    };
  }

  async getGradingStudents(
    subjectName: string,
    className: string,
    user: { id: string; role: Role; staffProfile?: { id: string } },
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { name: subjectName },
      select: { id: true },
    });

    const classSection = await this.prisma.classSection.findFirst({
      where: { name: className },
      select: { id: true },
    });

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    const term = activeTerm || await this.prisma.term.findFirst({
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    if (!subject?.id || !classSection?.id || !term?.id) {
      return [];
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const isAssigned = await this.prisma.teachingAssignment.findFirst({
      where: {
        teacherId: staffProfile?.id,
        subjectId: subject.id,
        classSectionId: classSection.id,
      },
    });

    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.HEADMASTER && !isAssigned) {
      return [];
    }

    const studentsPromise = this.prisma.studentProfile.findMany({
      where: { currentClassId: classSection.id },
      select: { id: true, firstName: true, lastName: true, indexNumber: true },
      orderBy: { lastName: 'asc' },
    });

    const gradeEntriesPromise = this.prisma.gradeEntry.findMany({
      where: { subjectId: subject.id, termId: term.id },
      select: { studentId: true, classScore: true, examScore: true, totalScore: true, grade: true, remark: true, hasObservation: true },
    });

    const [students, gradeEntries] = await Promise.all([studentsPromise, gradeEntriesPromise]);

    const gradeMap = new Map(gradeEntries.map((g) => [g.studentId, g]));

    return students.map((s) => {
      const g = gradeMap.get(s.id);
      let auditStatus;
      if (g === undefined) {
        auditStatus = undefined;
      } else if (g.hasObservation) {
        auditStatus = 'COMPLETE';
      } else {
        auditStatus = 'MISSING';
      }
      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        index: s.indexNumber,
        sba: g?.classScore ?? 0,
        exam: g?.examScore ?? 0,
        final: g?.totalScore ?? 0,
        grade: g?.grade ?? '',
        auditStatus,
        remark: g?.remark ?? '',
      };
    });
  }
}

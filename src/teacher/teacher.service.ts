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

      const previousTerm = activeTerm
        ? await this.prisma.term.findFirst({
            where: {
              startDate: { lt: activeTerm.startDate },
            },
            orderBy: { startDate: 'desc' },
          })
        : null;

      const assignmentStudentData = await Promise.all(
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

          return {
            assignment,
            students,
            studentIds: students.map((student) => student.id),
          };
        }),
      );

      const allStudentIds = Array.from(
        new Set(assignmentStudentData.flatMap((item) => item.studentIds)),
      );
      const subjectIds = Array.from(
        new Set(assignments.map((assignment) => assignment.subjectId)),
      );

      const previousGrades =
        previousTerm && allStudentIds.length > 0 && subjectIds.length > 0
          ? await this.prisma.gradeEntry.findMany({
              where: {
                termId: previousTerm.id,
                studentId: { in: allStudentIds },
                subjectId: { in: subjectIds },
              },
              select: {
                studentId: true,
                subjectId: true,
                totalScore: true,
              },
            })
          : [];

      const previousGradeMap = new Map<string, number>();
      previousGrades.forEach((grade) => {
        if (typeof grade.totalScore === 'number') {
          previousGradeMap.set(
            `${grade.studentId}:${grade.subjectId}`,
            grade.totalScore,
          );
        }
      });

      const getStudentTrend = (
        studentId: string,
        subjectId: string,
        score: number,
      ) => {
        const previousScore = previousGradeMap.get(`${studentId}:${subjectId}`);

        if (previousScore === undefined) {
          return { trend: '0', trendUp: true };
        }

        const delta = Math.round(score - previousScore);
        return {
          trend: delta === 0 ? '0' : delta > 0 ? `+${delta}` : `${delta}`,
          trendUp: delta >= 0,
        };
      };

      const classProgress = await Promise.all(
        assignmentStudentData.map(async ({ assignment, studentIds }) => {
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
        assignmentStudentData.map(async ({ assignment, studentIds }) => {
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
            const trend = getStudentTrend(
              student.id,
              assignment.subjectId,
              score,
            );

            studentScores.push({
              id: grade.id,
              student: observation.student,
              class: assignment.classSection.name,
              index: student.indexNumber,
              score,
              trend: trend.trend,
              trendUp: trend.trendUp,
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
          select: {
            firstName: true,
            lastName: true,
            indexNumber: true,
            currentClass: { select: { name: true } },
          },
        });
        const subject = await this.prisma.subject.findUnique({
          where: { id: r.subjectId },
          select: { name: true },
        });
        return {
          id: r.id,
          teacherId: r.teacherId,
          student: student
            ? `${student.firstName} ${student.lastName}`
            : 'Unknown Student',
          index: student?.indexNumber || '',
          class: student?.currentClass?.name || 'Unknown Class',
          subject: subject?.name || 'Unknown Subject',
          issue: r.issue,
          severity: r.severity,
          status: r.status,
          time: r.createdAt.toISOString(),
          history: Array.isArray(r.history) ? r.history : [],
        };
      }),
    );

    return transformed;
  }

  async submitGradeRevision(
    body: { gradeEntryId: string; issue: string; severity: string },
    requester: { id: string; role: Role; staffProfile?: { id: string } },
  ) {
    const gradeEntry = await this.prisma.gradeEntry.findUnique({
      where: { id: body.gradeEntryId },
      include: {
        student: { include: { currentClass: true } },
        subject: true,
      },
    });

    if (!gradeEntry) {
      throw new Error('Grade entry not found');
    }

    const isHod = requester.role === Role.HOD;
    const targetTeacherId = isHod
      ? await this.resolveTeacherStaffId(gradeEntry.submittedById)
      : requester.staffProfile?.id || requester.id;

    const revision = await this.prisma.gradeRevision.create({
      data: {
        teacherId: targetTeacherId,
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

    if (isHod) {
      await this.notifyStaff(
        targetTeacherId,
        'Grade Revision Requested',
        `HOD has requested a revision for ${revision.className || 'a class'} — ${body.issue}`,
        requester.id,
      );
    } else {
      const hodStaffIds = await this.resolveHodStaffIdsForRequester(requester);
      await Promise.all(
        hodStaffIds.map((hodId) =>
          this.notifyStaff(
            hodId,
            'Grade Revision Requested',
            `Teacher has requested a grade revision for ${revision.className || 'a class'}`,
            requester.id,
          ),
        ),
      );
    }

    return revision;
  }

  private async resolveHodStaffIdsForRequester(requester: {
    id: string;
    staffProfile?: { id: string };
  }): Promise<string[]> {
    const staffProfileId = requester.staffProfile?.id;
    if (!staffProfileId) return [];
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: staffProfileId },
      select: { departmentId: true },
    });
    if (!staff?.departmentId) return [];
    const hodProfiles = await this.prisma.staffProfile.findMany({
      where: {
        departmentId: staff.departmentId,
        user: { role: Role.HOD },
      },
      select: { id: true },
    });
    return hodProfiles.map((p) => p.id);
  }

  private async notifyStaff(
    staffId: string | null,
    title: string,
    body: string,
    createdById?: string,
  ) {
    if (!staffId) return;
    try {
      await this.prisma.notification.create({
        data: {
          staffId,
          title,
          body,
          channel: 'APP',
          createdById: createdById || staffId,
        },
      });
    } catch {
      // notification failure must not break main flow
    }
  }

  private async resolveTeacherStaffId(
    userId: string | null | undefined,
  ): Promise<string> {
    if (!userId) return userId || '';
    const staff = await this.prisma.staffProfile.findFirst({
      where: { userId },
      select: { id: true },
    });
    return staff?.id || userId;
  }

  async updateGradeRevision(
    revisionId: string,
    body: { status?: string; history?: any },
    requester: { id: string; role: Role; staffProfile?: { id: string } },
  ) {
    const revision = await this.prisma.gradeRevision.findUnique({
      where: { id: revisionId },
    });

    if (!revision) {
      throw new Error('Revision not found');
    }

    if (
      requester.role === Role.TEACHER &&
      revision.teacherId !== (requester.staffProfile?.id || requester.id)
    ) {
      throw new ForbiddenException(
        'You can only update your own revision requests',
      );
    }

    const updated = await this.prisma.gradeRevision.update({
      where: { id: revisionId },
      data: {
        status: body.status || revision.status,
        history: body.history !== undefined ? body.history : revision.history,
      },
    });

    if (requester.role === Role.TEACHER && body.status === 'TEACHER_REPLIED') {
      const hodStaffIds = await this.resolveHodStaffIdsForRequester(requester);
      await Promise.all(
        hodStaffIds.map((hodId) =>
          this.notifyStaff(
            hodId,
            'Grade Revision Response',
            `Teacher has responded to your revision request for ${revision.className || 'a class'}`,
            requester.id,
          ),
        ),
      );
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: updated.studentId },
      select: {
        firstName: true,
        lastName: true,
        indexNumber: true,
        currentClass: { select: { name: true } },
      },
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
      history: Array.isArray(updated.history) ? updated.history : [],
    };
  }

  async getGradeIssues(teacherId: string) {
    const revisions = await this.prisma.gradeRevision.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });

    const transformed = await Promise.all(
      revisions.map(async (r) => {
        const student = await this.prisma.studentProfile.findUnique({
          where: { id: r.studentId },
          select: {
            firstName: true,
            lastName: true,
            indexNumber: true,
            currentClass: { select: { name: true } },
          },
        });
        const subject = await this.prisma.subject.findUnique({
          where: { id: r.subjectId },
          select: { name: true },
        });

        return {
          id: r.id,
          recordId: r.id,
          studentId: r.studentId,
          student: student
            ? `${student.firstName} ${student.lastName}`
            : 'Unknown Student',
          index: student?.indexNumber || '',
          className:
            r.className || student?.currentClass?.name || 'Unknown Class',
          subject: subject?.name || 'Unknown Subject',
          issue: r.issue,
          status: r.status,
          date: r.createdAt.toISOString().split('T')[0],
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
    );

    return transformed;
  }

  async getGradeIssueStatusMeta(teacherId: string) {
    const revisions = await this.prisma.gradeRevision.findMany({
      where: { teacherId },
      select: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const r of revisions) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }

    return {
      total: revisions.length,
      counts,
      statuses: Object.keys(counts),
    };
  }

  async getSettingsClasses(user: {
    id: string;
    role: Role;
    staffProfile?: { id: string };
  }) {
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId: user.id },
    });

    if (!staffProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: staffProfile.id },
      include: {
        subject: { include: { department: true } },
        classSection: { include: { classTeacher: true } },
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

        return {
          id: assignment.id,
          subject: assignment.subject.name,
          className: assignment.classSection.name,
          studentCount: students.length,
        };
      }),
    );
  }

  async getNotificationPreferences() {
    return [
      {
        id: 'email',
        label: 'Email Notifications',
        desc: 'Receive grade and behavior alerts via email',
        enabled: true,
      },
      {
        id: 'sms',
        label: 'SMS Notifications',
        desc: 'Receive urgent alerts via SMS',
        enabled: false,
      },
      {
        id: 'app',
        label: 'In-App Notifications',
        desc: 'Show notifications within the dashboard',
        enabled: true,
      },
    ];
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      department?: string;
      email?: string;
      phone?: string;
    },
  ) {
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: { user: { select: { role: true } } },
    });

    if (!staffProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    const nameParts = (data.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || staffProfile.firstName;
    const lastName =
      nameParts.length > 1
        ? nameParts[nameParts.length - 1]
        : staffProfile.lastName;

    await this.prisma.staffProfile.update({
      where: { id: staffProfile.id },
      data: {
        firstName,
        lastName,
        phone: data.phone ?? staffProfile.phone,
      },
    });

    if (data.email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email: data.email },
      });
    }

    return this.getProfile({
      id: userId,
      role: staffProfile.user?.role || 'TEACHER',
    } as any);
  }

  async getSubjectConfig() {
    const subjects = await this.prisma.subject.findMany({
      where: { isActive: true },
      include: { department: { select: { name: true, code: true } } },
      orderBy: { name: 'asc' },
    });

    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      type: s.type,
      department: s.department?.name || null,
      departmentCode: s.department?.code || null,
    }));
  }

  async getGradingStatusMeta() {
    return {
      statuses: [
        'PENDING',
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'REVISION_REQUESTED',
      ],
      colors: {
        PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
        SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
        UNDER_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
        APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        REVISION_REQUESTED: 'bg-red-50 text-red-700 border-red-200',
      },
    };
  }

  async getGradingFilterOptions() {
    const [departments, levels, terms] = await Promise.all([
      this.prisma.department.findMany({
        where: { subjects: { some: {} } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.classSection.findMany({
        select: { level: true },
        distinct: ['level'],
        orderBy: { level: 'asc' },
      }),
      this.prisma.term.findMany({
        select: {
          id: true,
          termNumber: true,
          academicYear: { select: { label: true } },
        },
        orderBy: { startDate: 'desc' },
        take: 10,
      }),
    ]);

    return {
      departments: departments.map((d) => ({ id: d.id, name: d.name })),
      levels: levels.map((l) => l.level),
      terms: terms.map((t) => ({
        id: t.id,
        label: `${t.academicYear.label} - ${t.termNumber}`,
        termNumber: t.termNumber,
      })),
    };
  }

  async getObservationTypes() {
    return [
      { id: 'ACADEMIC', label: 'Academic', color: 'bg-blue-100 text-blue-800' },
      {
        id: 'BEHAVIOR',
        label: 'Behavior',
        color: 'bg-amber-100 text-amber-800',
      },
      {
        id: 'ATTENDANCE',
        label: 'Attendance',
        color: 'bg-purple-100 text-purple-800',
      },
      { id: 'GENERAL', label: 'General', color: 'bg-gray-100 text-gray-800' },
    ];
  }

  async getObservationColors() {
    return {
      ACADEMIC: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
      },
      BEHAVIOR: {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300',
      },
      ATTENDANCE: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-300',
      },
      GENERAL: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
      },
      COMPLETE: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
      },
      MISSING: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      },
      LOGGED: {
        bg: 'bg-cyan-100',
        text: 'text-cyan-800',
        border: 'border-cyan-300',
      },
      PENDING: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
      },
    };
  }

  async getAnalyticsObservationColors() {
    return {
      COMPLETE: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
      },
      MISSING: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      },
      LOGGED: {
        bg: 'bg-cyan-100',
        text: 'text-cyan-800',
        border: 'border-cyan-300',
      },
      PENDING: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
      },
      IN_PROGRESS: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
      },
      RESOLVED: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
      },
    };
  }

  async getGradeConfig() {
    return {
      minScore: 0,
      maxScore: 100,
      passingGrade: 50,
      bands: [
        { grade: 'A1', min: 80, max: 100, remark: 'EXCELLENT' },
        { grade: 'B2', min: 70, max: 79, remark: 'VERY_GOOD' },
        { grade: 'B3', min: 65, max: 69, remark: 'GOOD' },
        { grade: 'C4', min: 60, max: 64, remark: 'CREDIT' },
        { grade: 'C5', min: 55, max: 59, remark: 'PASS' },
        { grade: 'C6', min: 50, max: 54, remark: 'PASS' },
        { grade: 'D7', min: 45, max: 49, remark: 'WEAK_PASS' },
        { grade: 'E8', min: 40, max: 44, remark: 'WEAK_PASS' },
        { grade: 'F9', min: 0, max: 39, remark: 'FAILURE' },
      ],
    };
  }

  async getMissingObservationsTray() {
    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    if (!activeTerm) return [];

    const entries = await this.prisma.gradeEntry.findMany({
      where: {
        termId: activeTerm.id,
        hasObservation: false,
        OR: [{ classScore: { not: null } }, { examScore: { not: null } }],
      },
      include: {
        student: {
          select: {
            indexNumber: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true } },
          },
        },
        subject: { select: { name: true, code: true } },
      },
      orderBy: { student: { lastName: 'asc' } },
    });

    const teacherMap = await this.getTeacherNameMap(
      entries.map((entry) => entry.submittedById),
    );

    return entries.map((entry) => ({
      id: entry.id,
      student: entry.student
        ? `${entry.student.firstName || ''} ${entry.student.lastName || ''}`.trim()
        : 'Unknown',
      index: entry.student?.indexNumber || '',
      class: entry.student?.currentClass?.name || 'Unknown Class',
      type: entry.subject?.name || 'Unknown Subject',
      comment: entry.observationText || entry.remark || 'Missing observation',
      status: 'Missing',
      date: entry.updatedAt
        ? entry.updatedAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      teacher: entry.submittedById
        ? teacherMap.get(entry.submittedById) || 'Unknown'
        : 'Unknown',
    }));
  }

  async getProfile(user: {
    id: string;
    role: Role;
    staffProfile?: { id: string };
  }) {
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: { select: { email: true, phone: true, role: true } },
        department: { select: { name: true, code: true } },
      },
    });

    if (!staffProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    return {
      id: staffProfile.id,
      staffId: staffProfile.staffId,
      name: `${staffProfile.firstName} ${staffProfile.lastName}`,
      firstName: staffProfile.firstName,
      lastName: staffProfile.lastName,
      middleName: staffProfile.middleName,
      gender: staffProfile.gender,
      dateOfBirth: staffProfile.dateOfBirth,
      phone: staffProfile.phone || staffProfile.user?.phone || '',
      email: staffProfile.user?.email || '',
      department: staffProfile.department?.name || '',
      departmentCode: staffProfile.department?.code || '',
      role: user.role,
      hiredAt: staffProfile.hiredAt,
    };
  }

  async getSupportObservations(user: {
    id: string;
    role: Role;
    staffProfile?: { id: string };
  }) {
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId: user.id },
    });

    if (!staffProfile) {
      throw new NotFoundException('Teacher profile not found');
    }

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: staffProfile.id },
      select: { subjectId: true, classSectionId: true },
    });

    const subjectIds = [...new Set(assignments.map((a) => a.subjectId))];
    const classSectionIds = [
      ...new Set(assignments.map((a) => a.classSectionId)),
    ];

    const whereClause: any = { hasObservation: true };

    if (subjectIds.length > 0) {
      whereClause.subjectId = { in: subjectIds };
    }

    const entries = await this.prisma.gradeEntry.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            indexNumber: true,
            firstName: true,
            lastName: true,
            currentClassId: true,
            currentClass: { select: { name: true } },
          },
        },
        subject: { select: { name: true, code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const filteredEntries =
      classSectionIds.length > 0
        ? entries.filter(
            (e) =>
              e.student?.currentClassId &&
              classSectionIds.includes(e.student.currentClassId),
          )
        : entries;

    const teacherMap = await this.getTeacherNameMap(
      filteredEntries.map((entry) => entry.submittedById),
    );

    return filteredEntries.map((entry) => ({
      id: entry.id,
      type: entry.subject?.name || 'Unknown Subject',
      student: entry.student
        ? `${entry.student.firstName || ''} ${entry.student.lastName || ''}`.trim()
        : 'Unknown Student',
      teacher: entry.submittedById
        ? teacherMap.get(entry.submittedById) || 'Unknown'
        : 'Unknown',
      comment: entry.observationText || entry.remark || '',
      date: entry.updatedAt
        ? entry.updatedAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    }));
  }

  private async getTeacherNameMap(userIds: Array<string | null | undefined>) {
    const ids = [...new Set(userIds.filter(Boolean))] as string[];
    if (ids.length === 0) return new Map<string, string>();

    const staffProfiles = await this.prisma.staffProfile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, firstName: true, lastName: true },
    });

    return new Map(
      staffProfiles.map((staff) => [
        staff.userId,
        `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
      ]),
    );
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

    const term =
      activeTerm ||
      (await this.prisma.term.findFirst({
        orderBy: { startDate: 'desc' },
        select: { id: true, termNumber: true },
      }));

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

    const term =
      activeTerm ||
      (await this.prisma.term.findFirst({
        orderBy: { startDate: 'desc' },
        select: { id: true },
      }));

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

    if (
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.HEADMASTER &&
      !isAssigned
    ) {
      return [];
    }

    const studentsPromise = this.prisma.studentProfile.findMany({
      where: { currentClassId: classSection.id },
      select: { id: true, firstName: true, lastName: true, indexNumber: true },
      orderBy: { lastName: 'asc' },
    });

    const gradeEntriesPromise = this.prisma.gradeEntry.findMany({
      where: { subjectId: subject.id, termId: term.id },
      select: {
        id: true,
        studentId: true,
        classScore: true,
        examScore: true,
        totalScore: true,
        grade: true,
        remark: true,
        hasObservation: true,
      },
    });

    const [students, gradeEntries] = await Promise.all([
      studentsPromise,
      gradeEntriesPromise,
    ]);

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
        gradeEntryId: g?.id,
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

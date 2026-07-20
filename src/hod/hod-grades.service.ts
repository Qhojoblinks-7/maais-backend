import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class HODGradeService {
  constructor(private prisma: PrismaService) {}

  async getGradeRevisions(userId: string, role: Role) {
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

    const departmentSubjectIds = await this.prisma.subject
      .findMany({
        where: { departmentId: staffProfile.departmentId },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    const revisions = await this.prisma.gradeRevision.findMany({
      where: {
        subjectId: { in: departmentSubjectIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    const studentIds = [...new Set(revisions.map((r) => r.studentId))];
    const subjectIds = [...new Set(revisions.map((r) => r.subjectId))];

    const [students, subjects] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          indexNumber: true,
          currentClass: { select: { name: true } },
        },
      }),
      this.prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      }),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    return revisions.map((r) => {
      const student = studentMap.get(r.studentId);
      const subject = subjectMap.get(r.subjectId);
      return {
        id: r.id,
        teacherId: r.teacherId,
        student: student
          ? `${student.firstName} ${student.lastName}`
          : 'Unknown',
        index: student?.indexNumber || '',
        class: student?.currentClass?.name || r.className || 'Unknown',
        subject: subject?.name || 'Unknown',
        issue: r.issue,
        status: r.status,
        severity: r.severity,
        time: r.createdAt.toISOString(),
        history: Array.isArray(r.history) ? r.history : [],
        recordId: r.gradeEntryId,
      };
    });
  }

  async createHODGradeRevision(
    body: {
      classSectionId?: string;
      gradeEntryId?: string;
      issue: string;
      severity: string;
    },
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can request grade revisions');

    if (!body?.issue || !body.issue.trim())
      throw new ForbiddenException('An issue description is required');
    if (!body?.classSectionId && !body?.gradeEntryId)
      throw new ForbiddenException(
        'A class section or grade entry is required',
      );

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const departmentSubjectIds = await this.prisma.subject
      .findMany({
        where: { departmentId: staffProfile.departmentId },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    const term = await this.prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });
    if (!term) throw new NotFoundException('No active term found');

    let gradeEntry: any;
    let className = '';

    if (body.gradeEntryId) {
      gradeEntry = await this.prisma.gradeEntry.findUnique({
        where: { id: body.gradeEntryId },
        include: {
          student: { include: { currentClass: true } },
          subject: true,
        },
      });
      if (!gradeEntry) throw new NotFoundException('Grade entry not found');
      if (!departmentSubjectIds.includes(gradeEntry.subjectId))
        throw new ForbiddenException('Subject not in your department');
      className = gradeEntry.student.currentClass?.name || '';
    } else {
      const classSection = await this.prisma.classSection.findUnique({
        where: { id: body.classSectionId },
        include: {
          teachingAssignments: {
            include: { subject: { select: { departmentId: true } } },
          },
        },
      });
      if (!classSection) throw new NotFoundException('Class not found');

      const isDepartmentClass = classSection.teachingAssignments.some(
        (ta) => ta.subject.departmentId === staffProfile.departmentId,
      );
      if (!isDepartmentClass)
        throw new ForbiddenException('Class not in your department');

      gradeEntry = await this.prisma.gradeEntry.findFirst({
        where: {
          termId: term.id,
          subjectId: { in: departmentSubjectIds },
          student: { currentClassId: body.classSectionId },
        },
        include: {
          student: { include: { currentClass: true } },
          subject: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!gradeEntry)
        throw new NotFoundException(
          'No grade entries found for this class in the active term',
        );
      className = gradeEntry.student.currentClass?.name || classSection.name;
    }

    const existing = await this.prisma.gradeRevision.findFirst({
      where: {
        subjectId: gradeEntry.subjectId,
        gradeEntryId: gradeEntry.id,
        status: 'AWAITING_APPROVAL',
      },
    });
    if (existing) {
      return this.mapRevision(existing, gradeEntry);
    }

    const targetTeacherId = gradeEntry.submittedById
      ? await this.prisma.staffProfile
          .findFirst({
            where: { userId: gradeEntry.submittedById },
            select: { id: true },
          })
          .then((s) => s?.id || gradeEntry.submittedById)
      : gradeEntry.submittedById || '';

    const created = await this.prisma.gradeRevision.create({
      data: {
        teacherId: targetTeacherId,
        studentId: gradeEntry.studentId,
        subjectId: gradeEntry.subjectId,
        gradeEntryId: gradeEntry.id,
        className,
        issue: body.issue.trim(),
        severity: body.severity || 'medium',
        status: 'AWAITING_APPROVAL',
        history: [],
      },
    });

    await this.notifyTeacher(
      targetTeacherId,
      'Grade Revision Requested',
      `HOD has requested a revision for ${className || 'a class'} — ${body.issue.trim()}`,
      userId,
    );

    return this.mapRevision(created, gradeEntry);
  }

  async approveGradeEntry(
    gradeEntryId: string,
    comment: string,
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can approve grades');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const gradeEntry = await this.prisma.gradeEntry.findUnique({
      where: { id: gradeEntryId },
      include: { subject: true },
    });
    if (!gradeEntry) throw new NotFoundException('Grade entry not found');
    if (gradeEntry.subject?.departmentId !== staffProfile.departmentId)
      throw new ForbiddenException('Subject not in your department');

    const updated = await this.prisma.gradeEntry.update({
      where: { id: gradeEntryId },
      data: {
        isApproved: true,
        ...(comment ? { remark: comment } : {}),
      },
    });

    return updated;
  }

  private mapRevision(r: any, gradeEntry?: any) {
    const student = gradeEntry?.student;
    const subject = gradeEntry?.subject;
    return {
      id: r.id,
      teacherId: r.teacherId,
      student: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      index: student?.indexNumber || '',
      class: student?.currentClass?.name || r.className || 'Unknown',
      subject: subject?.name || 'Unknown',
      issue: r.issue,
      status: r.status,
      severity: r.severity,
      time:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      history: Array.isArray(r.history) ? r.history : [],
      recordId: r.gradeEntryId,
    };
  }

  async approveGradeRevision(
    recordId: string,
    comment: string,
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can approve grade revisions');
    const revision = await this.prisma.gradeRevision.findUnique({
      where: { id: recordId },
    });
    if (!revision) throw new NotFoundException('Revision not found');

    const existingHistory = Array.isArray(revision.history)
      ? revision.history
      : [];
    const updatedHistory = [
      ...existingHistory,
      {
        id: Date.now(),
        role: 'HOD',
        user: 'HOD',
        message: comment,
        time: new Date().toISOString(),
      },
    ];

    const updated = await this.prisma.gradeRevision.update({
      where: { id: recordId },
      data: { status: 'RESOLVED', history: updatedHistory },
    });

    await this.notifyTeacher(
      revision.teacherId,
      'Grade Revision Approved',
      `Your grade revision for ${revision.className || 'a class'} has been approved by HOD.`,
      userId,
    );

    return updated;
  }

  async rejectGradeRevision(
    recordId: string,
    reason: string,
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can reject grade revisions');
    const revision = await this.prisma.gradeRevision.findUnique({
      where: { id: recordId },
    });
    if (!revision) throw new NotFoundException('Revision not found');

    const existingHistory = Array.isArray(revision.history)
      ? revision.history
      : [];
    const updatedHistory = [
      ...existingHistory,
      {
        id: Date.now(),
        role: 'HOD',
        user: 'HOD',
        message: reason,
        time: new Date().toISOString(),
      },
    ];

    const updated = await this.prisma.gradeRevision.update({
      where: { id: recordId },
      data: { status: 'REJECTED', history: updatedHistory },
    });

    await this.notifyTeacher(
      revision.teacherId,
      'Grade Revision Rejected',
      `Your grade revision for ${revision.className || 'a class'} was reviewed and requires further action.`,
      userId,
    );

    return updated;
  }

  private async notifyTeacher(
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

  async updateHODComment(
    recordId: string,
    comment: string,
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can add comments');
    const revision = await this.prisma.gradeRevision.findUnique({
      where: { id: recordId },
    });
    if (!revision) throw new NotFoundException('Revision not found');
    const existingHistory = Array.isArray(revision.history)
      ? revision.history
      : [];
    const updatedHistory = [
      ...existingHistory,
      {
        id: Date.now(),
        role: 'HOD',
        user: 'HOD',
        message: comment,
        time: new Date().toISOString(),
      },
    ];
    const updated = await this.prisma.gradeRevision.update({
      where: { id: recordId },
      data: { history: updatedHistory },
    });

    await this.notifyTeacher(
      revision.teacherId,
      'HOD Feedback Added',
      `HOD has added feedback on your grade revision for ${revision.className || 'a class'}: ${comment}`,
      userId,
    );

    return updated;
  }

  async lockTerm(termId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Only HODs or above can lock terms');
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile && role === Role.HOD)
      throw new ForbiddenException('HOD profile not found');

    if (role === Role.HOD && staffProfile) {
      const departmentSubjects = await this.prisma.subject.findMany({
        where: { departmentId: staffProfile.departmentId },
        select: { id: true },
      });
      const hasGradesForDepartment = await this.prisma.gradeEntry.findFirst({
        where: {
          termId,
          subjectId: { in: departmentSubjects.map((s) => s.id) },
        },
      });
      if (!hasGradesForDepartment)
        throw new ForbiddenException(
          'No grades found for this department in the specified term',
        );
    }

    const term = await this.prisma.term.findUnique({
      where: { id: termId },
    });
    if (!term) throw new NotFoundException('Term not found');

    const updated = await this.prisma.term.update({
      where: { id: termId },
      data: { isLocked: true },
    });

    // Cascade lock: mark all grade entries for this term as locked
    await this.prisma.gradeEntry.updateMany({
      where: { termId },
      data: { isLocked: true },
    });

    return updated;
  }

  async lockClassMatrix(classSectionId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can lock class matrices',
      );
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile && role === Role.HOD)
      throw new ForbiddenException('HOD profile not found');

    const classSection = await this.prisma.classSection.findUnique({
      where: { id: classSectionId },
      include: {
        teachingAssignments: {
          include: { subject: { select: { departmentId: true } } },
        },
      },
    });

    if (!classSection) {
      throw new NotFoundException('Class not found');
    }

    if (role === Role.HOD && staffProfile) {
      const isDepartmentClass = classSection.teachingAssignments.some(
        (ta) => ta.subject.departmentId === staffProfile.departmentId,
      );
      if (!isDepartmentClass) {
        throw new ForbiddenException('Class not in your department');
      }
    }

    const subjectIds = classSection.teachingAssignments.map(
      (ta) => ta.subjectId,
    );

    const studentIds = await this.prisma.studentProfile
      .findMany({
        where: { currentClassId: classSectionId, archivedAt: null },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    if (studentIds.length > 0) {
      await this.prisma.gradeEntry.updateMany({
        where: {
          studentId: { in: studentIds },
          subjectId: { in: subjectIds },
        },
        data: { isLocked: true },
      });
    }

    return { success: true, message: 'Class matrix locked successfully' };
  }

  async lockDepartmentMatrix(termId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can lock department matrices',
      );
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile && role === Role.HOD)
      throw new ForbiddenException('HOD profile not found');

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId: staffProfile.departmentId },
      select: { id: true },
    });

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subjectId: { in: departmentSubjects.map((s) => s.id) } },
      select: { classSectionId: true },
    });
    const classIds = [
      ...new Set(teachingAssignments.map((ta) => ta.classSectionId)),
    ];

    const studentIds = await this.prisma.studentProfile
      .findMany({
        where: { currentClassId: { in: classIds }, archivedAt: null },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    const result =
      studentIds.length > 0
        ? await this.prisma.gradeEntry.updateMany({
            where: {
              termId,
              subjectId: { in: departmentSubjects.map((s) => s.id) },
              studentId: { in: studentIds },
            },
            data: { isLocked: true },
          })
        : { count: 0 };

    return {
      success: true,
      message: `Department matrix locked successfully. ${result.count} grade entries locked.`,
      lockedCount: result.count,
    };
  }

  async unlockTerm(termId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Only HODs or above can unlock terms');
    }
    const term = await this.prisma.term.findUnique({
      where: { id: termId },
    });
    if (!term) throw new NotFoundException('Term not found');

    const updated = await this.prisma.term.update({
      where: { id: termId },
      data: { isLocked: false },
    });

    await this.prisma.gradeEntry.updateMany({
      where: { termId },
      data: { isLocked: false, lockedById: null, lockedAt: null },
    });

    return updated;
  }

  async unlockClassMatrix(classSectionId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can unlock class matrices',
      );
    }

    const studentIds = await this.prisma.studentProfile
      .findMany({
        where: { currentClassId: classSectionId, archivedAt: null },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    if (studentIds.length > 0) {
      await this.prisma.gradeEntry.updateMany({
        where: {
          studentId: { in: studentIds },
        },
        data: { isLocked: false },
      });
    }

    return { success: true, message: 'Class matrix unlocked successfully' };
  }

  async unlockDepartmentMatrix(termId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can unlock department matrices',
      );
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile && role === Role.HOD)
      throw new ForbiddenException('HOD profile not found');

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId: staffProfile.departmentId },
      select: { id: true },
    });

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subjectId: { in: departmentSubjects.map((s) => s.id) } },
      select: { classSectionId: true },
    });
    const classIds = [
      ...new Set(teachingAssignments.map((ta) => ta.classSectionId)),
    ];

    const studentIds = await this.prisma.studentProfile
      .findMany({
        where: { currentClassId: { in: classIds }, archivedAt: null },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    const result =
      studentIds.length > 0
        ? await this.prisma.gradeEntry.updateMany({
            where: {
              termId,
              subjectId: { in: departmentSubjects.map((s) => s.id) },
              studentId: { in: studentIds },
            },
            data: { isLocked: false },
          })
        : { count: 0 };

    return {
      success: true,
      message: `Department matrix unlocked successfully. ${result.count} grade entries unlocked.`,
      unlockedCount: result.count,
    };
  }

  async validateLock(termId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can validate locks');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId: staffProfile.departmentId },
      select: { id: true },
    });

    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subjectId: { in: departmentSubjects.map((s) => s.id) } },
      select: { classSectionId: true },
    });
    const classIds = [
      ...new Set(teachingAssignments.map((ta) => ta.classSectionId)),
    ];

    const classStudentIds = await this.prisma.studentProfile
      .findMany({
        where: { currentClassId: { in: classIds }, archivedAt: null },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    const totalRequired = departmentSubjects.length * classStudentIds.length;

    const [
      completedGrades,
      attendanceRecords,
      signedEntries,
      observationsRecorded,
    ] = await Promise.all([
      this.prisma.gradeEntry.count({
        where: {
          termId,
          subjectId: { in: departmentSubjects.map((s) => s.id) },
          studentId: { in: classStudentIds },
          totalScore: { not: null },
        },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          termId,
          studentId: { in: classStudentIds },
        },
      }),
      this.prisma.gradeEntry.count({
        where: {
          termId,
          subjectId: { in: departmentSubjects.map((s) => s.id) },
          studentId: { in: classStudentIds },
          submittedById: { not: null },
        },
      }),
      this.prisma.gradeEntry.count({
        where: {
          termId,
          subjectId: { in: departmentSubjects.map((s) => s.id) },
          studentId: { in: classStudentIds },
          hasObservation: true,
        },
      }),
    ]);

    const totalAttendance = classStudentIds.length * 60; // Approx school days
    const attendancePct =
      totalAttendance > 0
        ? Math.round((attendanceRecords / totalAttendance) * 100)
        : 0;
    const signOffPct =
      totalRequired > 0 ? Math.round((signedEntries / totalRequired) * 100) : 0;
    const observationPct =
      totalRequired > 0
        ? Math.round((observationsRecorded / totalRequired) * 100)
        : 0;

    const completionPct =
      totalRequired > 0
        ? Math.round((completedGrades / totalRequired) * 100)
        : 0;
    const pendingSubmissions = totalRequired - completedGrades;

    const blockingIssues: string[] = [];
    if (pendingSubmissions > 0) {
      blockingIssues.push(
        `${pendingSubmissions} grades still pending (${completionPct}% complete)`,
      );
    }
    if (attendancePct < 90) {
      blockingIssues.push(
        `Attendance below 90% threshold (${attendancePct}% recorded)`,
      );
    }
    if (signOffPct < 100) {
      blockingIssues.push(
        `${100 - signOffPct}% of entries lack teacher sign-off`,
      );
    }
    if (observationPct < 100) {
      blockingIssues.push(
        `${100 - observationPct}% of entries lack observations`,
      );
    }

    return {
      canLock: blockingIssues.length === 0,
      isLocked: false,
      blockingIssues,
      warnings: [],
      pendingSubmissions,
      completionPct,
      attendancePct,
      signOffPct,
    };
  }

  async getLockedTerms(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs can view locked terms');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const terms = await this.prisma.term.findMany({
      where: { isLocked: true },
      orderBy: { startDate: 'desc' },
      include: { academicYear: true },
    });

    return terms.map((term) => ({
      id: term.id,
      termNumber: term.termNumber,
      academicYear: term.academicYear?.label || 'Unknown',
      isLocked: term.isLocked,
    }));
  }

  async getGradeComparison(
    subjectId: string,
    termA: string,
    termB: string,
    userId: string,
    role: Role,
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

    const departmentSubjectIds = await this.prisma.subject
      .findMany({
        where: { departmentId: staffProfile.departmentId },
        select: { id: true },
      })
      .then((s) => s.map((x) => x.id));

    if (!departmentSubjectIds.includes(subjectId)) {
      throw new ForbiddenException('Subject not in your department');
    }

    const gradesA = await this.prisma.gradeEntry.findMany({
      where: { subjectId, termId: termA },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            indexNumber: true,
          },
        },
      },
    });

    const gradesB = await this.prisma.gradeEntry.findMany({
      where: { subjectId, termId: termB },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            indexNumber: true,
          },
        },
      },
    });

    const comparison = gradesA.map((grade) => {
      const match = gradesB.find((g) => g.studentId === grade.studentId);
      return {
        studentId: grade.studentId,
        studentName:
          `${grade.student.firstName} ${grade.student.lastName || ''}`.trim(),
        indexNumber: grade.student.indexNumber,
        termAScore: grade.totalScore || 0,
        termBScore: match?.totalScore || 0,
        difference: (grade.totalScore || 0) - (match?.totalScore || 0),
      };
    });

    return comparison;
  }
}

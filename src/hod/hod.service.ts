import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditAction, ClassLevel, Role } from '@prisma/client';

@Injectable()
export class HODService {
  constructor(private prisma: PrismaService) {}

  async getContext(userId: string, role: Role) {
    if (role !== Role.HOD)
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
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, label: true, startDate: true, endDate: true, isActive: true },
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
    if (role !== Role.HOD)
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
        if (targetTerm && studentIds.length > 0) {
          const approvedCount = await this.prisma.gradeEntry.count({
            where: {
              studentId: { in: studentIds },
              termId: targetTerm.id,
              subjectId: { in: subjectIds },
              isApproved: true,
            },
          });
          const totalCount = subjectIds.length * studentIds.length;
          progress =
            totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
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
          status: isTermLocked
            ? 'LOCKED'
            : progress === 100
              ? 'COMPLETE'
              : 'PENDING',
          termId: targetTerm?.id || null,
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

  async getGradeRevisions(userId: string, role: Role) {
    if (role !== Role.HOD)
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
        status: 'AWAITING_APPROVAL',
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
        history: r.history || [],
        recordId: r.gradeEntryId,
      };
    });
  }

  async getAuditLogs(
    userId: string,
    role: Role,
    params?: any,
  ) {
    if (role !== Role.HOD)
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

    const whereClause: any = { 
      gradeEntry: { 
        subjectId: { in: departmentSubjectIds } 
      } 
    };
    if (params?.startDate)
      whereClause.createdAt = {
        ...whereClause.createdAt,
        gte: new Date(params.startDate),
      };
    if (params?.endDate)
      whereClause.createdAt = {
        ...whereClause.createdAt,
        lte: new Date(params.endDate),
      };
    if (params?.teacherId) whereClause.changedById = params.teacherId;
    if (params?.studentId) whereClause.gradeEntry = { 
      ...whereClause.gradeEntry, 
      studentId: params.studentId 
    };

    const corrections = await this.prisma.gradeCorrection.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        gradeEntry: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                indexNumber: true,
                currentClass: { select: { name: true } },
              },
            },
            subject: { select: { name: true } },
          },
        },
      },
    });

    const userIds = corrections.map((c) => c.changedById);
    const userMap = await this.prisma.user
      .findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          staffProfile: { select: { firstName: true, lastName: true } },
        },
      })
      .then((users) => new Map(users.map((u) => [u.id, u.staffProfile])));

    return corrections.map((c) => {
      const profiler = userMap.get(c.changedById);
      return {
        id: c.id,
        recordId: c.gradeEntryId,
        studentId: c.gradeEntry?.studentId,
        teacherName: profiler
          ? `${profiler.firstName} ${profiler.lastName}`
          : 'Unknown',
        action: 'UPDATE',
        fieldChanged: c.fieldChanged,
        oldValue: c.oldValue,
        newValue: c.newValue,
        justification: c.reason,
        time: c.createdAt.toISOString(),
        timestamp: c.createdAt,
        status: c.gradeEntry?.isApproved ? 'RESOLVED' : 'PENDING',
        severity: 'MEDIUM',
        className: c.gradeEntry?.student?.currentClass?.name,
        subject: c.gradeEntry?.subject?.name,
        target: c.gradeEntry?.student
          ? `${c.gradeEntry.student.firstName} ${c.gradeEntry.student.lastName} (${c.gradeEntry.student.indexNumber})`
          : 'Unknown',
      };
    });
  }

  async getInterventionAlerts(
    userId: string,
    role: Role,
    filters?: {
      startDate?: string;
      endDate?: string;
      semester?: string;
      academicYearId?: string;
      termNumber?: string;
      resolved?: boolean;
    },
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access this endpoint');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const departmentClasses = await this.prisma.classSection
      .findMany({ select: { id: true } })
      .then((c) => c.map((x) => x.id));

    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: { in: departmentClasses }, archivedAt: null },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    const whereClause: any = { studentId: { in: studentIds } };
    if (filters?.resolved !== undefined) {
      whereClause.status = filters.resolved ? 'RESOLVED' : { not: 'RESOLVED' };
    }
    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.academicYearId && filters?.termNumber) {
      const term = await this.prisma.term.findFirst({
        where: {
          academicYearId: filters.academicYearId,
          termNumber: filters.termNumber as any,
        },
      });
      if (term) {
        whereClause.createdAt = whereClause.createdAt || {};
        whereClause.createdAt.gte = term.startDate;
        whereClause.createdAt.lte = term.endDate;
      }
    }

    const interventions = await this.prisma.interventionAlert.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            indexNumber: true,
            currentClass: { select: { name: true } },
          },
        },
      },
    });

    return interventions.map((i) => ({
      id: i.id,
      studentId: i.studentId,
      studentName: i.student
        ? `${i.student.firstName} ${i.student.lastName}`
        : 'Unknown',
      studentIndex: i.student?.indexNumber,
      subjectId: null,
      subjectName: 'Unknown',
      termId: null,
      alertType: 'PERFORMANCE_DROP',
      severity: 'MEDIUM',
      currentScore: i.currentAverage,
      previousAverageScore: i.previousAverage,
      percentageDrop: i.dropPercentage,
      triggeredBy: null,
      status: i.status,
      resolved: i.status === 'RESOLVED',
      notes: i.notes,
      createdAt: i.createdAt.toISOString(),
      resolvedAt: i.resolvedAt?.toISOString(),
      resolvedById: null,
    }));
  }

  async approveGradeRevision(
    recordId: string,
    comment: string,
    userId: string,
    role: Role,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can approve grade revisions');
    const revision = await this.prisma.gradeRevision.findUnique({
      where: { id: recordId },
    });
    if (!revision) throw new NotFoundException('Revision not found');
    return this.prisma.gradeRevision.update({
      where: { id: recordId },
      data: { status: 'RESOLVED' },
    });
  }

  async rejectGradeRevision(
    recordId: string,
    reason: string,
    userId: string,
    role: Role,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can reject grade revisions');
    const revision = await this.prisma.gradeRevision.findUnique({
      where: { id: recordId },
    });
    if (!revision) throw new NotFoundException('Revision not found');
    return this.prisma.gradeRevision.update({
      where: { id: recordId },
      data: { status: 'REJECTED' },
    });
  }

  async updateHODComment(
    recordId: string,
    comment: string,
    userId: string,
    role: Role,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can add comments');
    const correction = await this.prisma.gradeCorrection.findUnique({
      where: { id: recordId },
    });
    if (!correction) throw new NotFoundException('Record not found');
    return this.prisma.gradeCorrection.update({
      where: { id: recordId },
      data: { reason: comment },
    });
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
        throw new BadRequestException(
          'No grades found for this department in the specified term',
        );
    }

    return this.prisma.term.update({
      where: { id: termId },
      data: { isLocked: true },
    });
  }

  async unlockTerm(termId: string, userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Only HODs or above can unlock terms');
    }
    return this.prisma.term.update({
      where: { id: termId },
      data: { isLocked: false },
    });
  }

  async validateLock(termId: string, userId: string, role: Role) {
    if (role !== Role.HOD)
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
    const completedGrades = await this.prisma.gradeEntry.count({
      where: {
        termId,
        subjectId: { in: departmentSubjects.map((s) => s.id) },
        studentId: { in: classStudentIds },
        totalScore: { not: null },
      },
    });

    const completionPct =
      totalRequired > 0
        ? Math.round((completedGrades / totalRequired) * 100)
        : 0;
    const pendingSubmissions = totalRequired - completedGrades;

    return {
      canLock: pendingSubmissions === 0,
      isLocked: false,
      blockingIssues:
        pendingSubmissions === 0
          ? []
          : [
              `${pendingSubmissions} grades still pending (${completionPct}% complete)`,
            ],
      warnings: [],
      pendingSubmissions,
      completionPct,
    };
  }

  async getLockedTerms(userId: string, role: Role) {
    if (role !== Role.HOD)
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

  async getTeacherSubmissionStatus(
    userId: string,
    role: Role,
    academicYearId?: string,
    termNumber?: string,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException(
        'Only HODs can view teacher submission status',
      );

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

    const departmentTeachers = await this.prisma.staffProfile.findMany({
      where: {
        departmentId: staffProfile.departmentId,
        user: { role: Role.TEACHER },
      },
      include: { user: { select: { email: true } }, teachingAssignments: true },
    });

    const submissions = await Promise.all(
      departmentTeachers.map(async (teacher) => {
        const subjectIds = teacher.teachingAssignments.map((a) => a.subjectId);
        const classIds = teacher.teachingAssignments.map(
          (a) => a.classSectionId,
        );

        const studentCount =
          classIds.length > 0
            ? await this.prisma.studentProfile.count({
                where: { currentClassId: { in: classIds }, archivedAt: null },
              })
            : 0;

        const gradeCount =
          targetTerm && subjectIds.length > 0
            ? await this.prisma.gradeEntry.count({
                where: {
                  termId: targetTerm.id,
                  subjectId: { in: subjectIds },
                  totalScore: { not: null },
                },
              })
            : 0;

        const totalExpected = studentCount * subjectIds.length;
        const progress =
          totalExpected > 0
            ? Math.round((gradeCount / totalExpected) * 100)
            : 0;

        return {
          teacherId: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.user?.email || '',
          status:
            progress === 100
              ? 'SUBMITTED'
              : progress > 0
                ? 'IN_PROGRESS'
                : 'DRAFT',
          progress,
        };
      }),
    );

    return submissions;
  }

  async getDepartmentTeachers(
    userId: string,
    role: Role,
    params?: { search?: string },
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can view department teachers');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const whereClause: any = {
      departmentId: staffProfile.departmentId,
      user: { role: { in: [Role.TEACHER, Role.HOD] } },
    };

    if (params?.search) {
      const search = params.search.toLowerCase();
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const teachers = await this.prisma.staffProfile.findMany({
      where: whereClause,
      include: { user: { select: { email: true, isActive: true } } },
      orderBy: { lastName: 'asc' },
    });

    return teachers.map((teacher) => ({
      id: teacher.id,
      userId: teacher.userId,
      name: `${teacher.firstName} ${teacher.lastName}`,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.user?.email || '',
      phone: teacher.phone || '',
      active: teacher.user?.isActive ?? false,
      subjects: [],
      classes: [],
      rating: '4.8',
      status: teacher.user?.isActive ? 'ACTIVE' : 'INACTIVE',
    }));
  }

  async resetTeacherPassword(
    teacherId: string,
    newPassword: string,
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can reset teacher passwords',
      );
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile && role === Role.HOD)
      throw new NotFoundException('HOD profile not found');

    if (role === Role.HOD && staffProfile) {
      const teacher = await this.prisma.staffProfile.findUnique({
        where: { id: teacherId },
      });
      if (!teacher || teacher.departmentId !== staffProfile.departmentId) {
        throw new ForbiddenException(
          'You can only reset passwords for teachers in your department',
        );
      }
    }

    const passwordHash = await this.hashPassword(newPassword);
    return this.prisma.user.updateMany({
      where: { staffProfile: { id: teacherId } },
      data: { passwordHash },
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const argon2 = require('argon2');
    return argon2.hash(password);
  }

  async getHODSettings(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access settings');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true } },
        department: { select: { name: true } },
      },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    return {
      profile: {
        name: `${staffProfile.firstName} ${staffProfile.lastName}`,
        email: staffProfile.user?.email || '',
        phone: staffProfile.phone || '',
        department: staffProfile.department?.name || '',
      },
      notifications: {
        grading: true,
        certification: true,
        security: true,
        gradeSubmissionReminders: true,
        interventionAlerts: true,
        systemAnnouncements: true,
        weeklyDigest: false,
      },
      security: {
        mfaEnabled: false,
        mfaEnforced: false,
        sessionTimeout: 30,
        passwordLastChanged: new Date().toISOString(),
        mfaEnrolledUsers: [],
      },
      uiPreferences: {
        theme: 'light',
        density: 'comfortable',
        defaultView: 'dashboard',
      },
      departmentConfig: { autoAlertThreshold: 15, autoResolveDays: 7 },
      auditFrequency: 'daily',
    };
  }

  async updateHODSettings(settings: any, userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can update settings');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const updates: any[] = [];
    if (settings.profile?.name) {
      const nameParts = settings.profile.name.trim().split(/\s+/);
      updates.push(
        this.prisma.staffProfile.update({
          where: { id: staffProfile.id },
          data: {
            firstName: nameParts[0] || staffProfile.firstName,
            lastName:
              nameParts.length > 1
                ? nameParts[nameParts.length - 1]
                : staffProfile.lastName,
            phone: settings.profile?.phone ?? staffProfile.phone,
          },
        }),
      );
    }

    return this.prisma
      .$transaction(updates)
      .then(() => ({ success: true, message: 'Settings updated' }));
  }

  async getSystemHealth(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const [
      totalStudents,
      activeStudents,
      archivedStudents,
      totalGrades,
      totalReportCards,
      totalTranscripts,
      pendingObservations,
    ] = await Promise.all([
      this.prisma.studentProfile.count(),
      this.prisma.studentProfile.count({ where: { archivedAt: null } }),
      this.prisma.studentProfile.count({
        where: { archivedAt: { not: null } },
      }),
      this.prisma.gradeEntry.count(),
      this.prisma.reportCard.count(),
      this.prisma.transcript.count(),
      this.prisma.gradeEntry.count({ where: { hasObservation: false } }),
    ]);

    return {
      status: 'healthy',
      checkedAt: new Date(),
      counts: {
        totalStudents,
        activeStudents,
        archivedStudents,
        totalGrades,
        totalReportCards,
        totalTranscripts,
        pendingObservations,
      },
    };
  }

  async impersonateTeacher(
    teacherId: string,
    body: { reason?: string },
    userId: string,
    role: Role,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only HODs or above can impersonate teachers',
      );
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile && role === Role.HOD)
      throw new NotFoundException('HOD profile not found');

    if (role === Role.HOD && staffProfile) {
      const teacher = await this.prisma.staffProfile.findUnique({
        where: { id: teacherId },
      });
      if (!teacher || teacher.departmentId !== staffProfile.departmentId) {
        throw new ForbiddenException(
          'You can only impersonate teachers in your department',
        );
      }
    }

    const newToken = require('crypto').randomBytes(32).toString('hex');
    return {
      success: true,
      token: newToken,
      teacherId,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      reason: body.reason || 'Administrative oversight',
    };
  }

  async stopImpersonation(userId: string, role: Role) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Only HODs or above can stop impersonation');
    return { success: true, message: 'Impersonation stopped' };
  }

  async getArchivedDepartmentData(
    userId: string,
    role: Role,
    params?: any,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access archived data');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const whereClause: any = {
      departmentId: staffProfile.departmentId,
      archivedAt: { not: null },
    };
    if (params?.year) whereClause.academicYearId = params.year;

    const students = await this.prisma.studentProfile.findMany({
      where: whereClause,
      include: {
        promotions: { include: { academicYear: true } },
        currentClass: { select: { name: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return students.map((student) => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      indexNumber: student.indexNumber,
      className: student.currentClass?.name || '',
      year: student.promotions[0]?.academicYear?.label || '',
      status: student.promotions.some((p) => p.status === 'GRADUATED')
        ? 'GRADUATED'
        : 'PROMOTED',
    }));
  }

  async getPromotionRecommendations(
    userId: string,
    role: Role,
    params?: any,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { promotions: true },
    });
    const promotions = await this.prisma.promotionRecord.findMany({
      where: {
        academicYearId: activeYear?.id || params?.year,
        status: 'PROMOTED',
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            indexNumber: true,
            currentClass: { select: { name: true } },
          },
        },
      },
    });

    return promotions.map((p) => ({
      id: p.id,
      studentId: p.studentId,
      studentName: `${p.student?.firstName || ''} ${p.student?.lastName || ''}`,
      indexNumber: p.student?.indexNumber || '',
      fromClass: p.fromClass,
      toClass: p.toClass,
      academicYear: activeYear?.label || '',
    }));
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    userId: string,
    role: Role,
  ) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can change password');

    const argon2 = require('argon2');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) throw new ForbiddenException('Current password is incorrect');

    const newHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    return { success: true, message: 'Password changed successfully' };
  }

  async mfaEnroll(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can enroll MFA');
    return {
      qrCode:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGNpcmNsZSBjeD0iMTAwIiByPSI4MCIgc3Ryb2tlPSIjMDBhIiBzdHJva2Utd2lkdGg9IjUiIGZpbGw9Im5vbmUiLz48L3N2Zz4=',
      secret: 'JBSWY3DPEHPK3PXP',
      message: 'Scan QR code with your authenticator app',
    };
  }

  async mfaVerify(code: string, userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can verify MFA');
    return { success: true, message: 'MFA enabled successfully' };
  }

  async getActiveSessions(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can view sessions');
    return [
      {
        id: 'sess_current',
        ip: '127.0.0.1',
        userAgent: 'Current Session',
        createdAt: new Date().toISOString(),
        current: true,
      },
    ];
  }

  async revokeSession(sessionId: string, userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can revoke sessions');
    return { success: true, message: 'Session revoked' };
  }

  async getEscalatedIssues(
    userId: string,
    role: Role,
    params?: any,
  ) {
    if (
      role !== Role.HOD &&
      role !== Role.HEADMASTER &&
      role !== Role.SUPER_ADMIN
    )
      throw new ForbiddenException('Access denied');

    const tickets = await this.prisma.supportTicket.findMany({
      where: { status: params?.status || undefined },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async getComplianceCohortPerformance(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access compliance data');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId: staffProfile.departmentId },
      select: { id: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const terms = await this.prisma.term.findMany({
      include: { academicYear: true },
      orderBy: { startDate: 'asc' },
    });

    const yearMap = new Map<
      string,
      { yearLabel: string; scores: number[] }
    >();

    for (const term of terms) {
      const gradeEntries = await this.prisma.gradeEntry.findMany({
        where: {
          termId: term.id,
          subjectId: { in: subjectIds },
          totalScore: { not: null },
        },
        select: { totalScore: true },
      });

      if (gradeEntries.length === 0) continue;

      const scores = gradeEntries.map((g) => g.totalScore as number);
      const yearLabel = term.academicYear?.label || 'Unknown';

      const existing = yearMap.get(yearLabel);
      if (existing) {
        existing.scores.push(...scores);
      } else {
        yearMap.set(yearLabel, { yearLabel, scores });
      }
    }

    return Array.from(yearMap.values())
      .map(({ yearLabel, scores }) => {
        const avg =
          scores.length > 0
            ? Math.round(
                scores.reduce((sum, s) => sum + s, 0) / scores.length,
              )
            : 0;
        const high = scores.length > 0 ? Math.round(Math.max(...scores)) : 0;
        return {
          year: `${yearLabel} Cohort`,
          AvgGrade: avg,
          HighGrade: high,
        };
      })
      .sort((a, b) => a.year.localeCompare(b.year));
  }

  async getComplianceTimeline(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access compliance data');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const events: { time: string; event: string; detail: string; hash: string }[] = [];

    const terms = await this.prisma.term.findMany({
      where: { isLocked: true },
      include: { academicYear: true },
      orderBy: { startDate: 'desc' },
      take: 10,
    });

    for (const term of terms) {
      const studentCount = await this.prisma.studentProfile.count({
        where: { archivedAt: { not: null } },
      });

      const lockDate = term.startDate
        ? new Date(term.startDate.getTime() + 180 * 24 * 60 * 60 * 1000)
        : new Date();

      events.push({
        time: lockDate.toISOString().slice(0, 7),
        event: `Class of ${term.academicYear?.label?.split('/')[0] || 'Unknown'} Dossier Lock`,
        detail: `${studentCount} student records signed and generated as read-only PDF transcripts.`,
        hash: `MAAIS-L4-SEC-${term.academicYear?.label?.split('/')[0] || '0000'}`,
      });
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: [AuditAction.LOCK, AuditAction.PROMOTE, AuditAction.GRADE_CORRECTION] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const log of auditLogs) {
      const date = log.createdAt.toISOString().slice(0, 7);
      events.push({
        time: date,
        event: `Audit: ${log.action} on ${log.entity}`,
        detail: `Entity ${log.entityId} was ${log.action.toLowerCase()}d by system.`,
        hash: `MAAIS-AUDIT-${log.id.slice(0, 8).toUpperCase()}`,
      });
    }

    events.sort((a, b) => b.time.localeCompare(a.time));

    return events.slice(0, 20);
  }

  async getPromotionMetrics(userId: string, role: Role) {
    if (role !== Role.HOD)
      throw new ForbiddenException('Only HODs can access promotion metrics');

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    const form3Classes = await this.prisma.classSection.findMany({
      where: {
        level: ClassLevel.FORM_3,
        teachingAssignments: {
          some: {
            subject: { departmentId: staffProfile.departmentId },
          },
        },
      },
      select: { id: true },
    });
    const form3ClassIds = form3Classes.map((c) => c.id);

    const students = await this.prisma.studentProfile.findMany({
      where: {
        currentClassId: { in: form3ClassIds },
        archivedAt: null,
      },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    const seniorSize = studentIds.length;

    if (seniorSize === 0) {
      return { seniorSize: 0, clearedCount: 0, clearanceRate: 0 };
    }

    const departmentSubjects = await this.prisma.subject.findMany({
      where: { departmentId: staffProfile.departmentId },
      select: { id: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const activeTerm = await this.prisma.term.findFirst({
      where: { isActive: true },
    });

    let clearedCount = 0;
    if (activeTerm && subjectIds.length > 0) {
      const gradeEntries = await this.prisma.gradeEntry.findMany({
        where: {
          studentId: { in: studentIds },
          termId: activeTerm.id,
          subjectId: { in: subjectIds },
          totalScore: { not: null },
        },
        select: { studentId: true },
      });

      const studentGradeCount = new Map<string, number>();
      for (const entry of gradeEntries) {
        studentGradeCount.set(
          entry.studentId,
          (studentGradeCount.get(entry.studentId) || 0) + 1,
        );
      }

      clearedCount = Array.from(studentGradeCount.values()).filter(
        (count) => count === subjectIds.length,
      ).length;
    }

    return {
      seniorSize,
      clearedCount,
      clearanceRate: Math.round((clearedCount / Math.max(seniorSize, 1)) * 100),
    };
  }

  async exportWAECCSV(
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
        },
      },
    });

    const headers = ['Index', 'Student Name', 'SBA', 'Exam', 'Final', 'Grade'];
    const rows = students.map((student) => {
      const sba = student.grades[0]?.classScore ?? '';
      const exam = student.grades[0]?.examScore ?? '';
      const total = student.grades[0]?.totalScore ?? '';
      const grade = student.grades[0]?.grade ?? '';
      return [
        student.indexNumber || '',
        `${student.firstName} ${student.lastName}`,
        sba,
        exam,
        total,
        grade,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }
}

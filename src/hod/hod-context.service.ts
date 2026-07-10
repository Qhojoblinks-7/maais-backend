import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class HODContextService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

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

    const cacheKey = this.getCacheKey('getDepartmentProgress', {
      userId,
      role,
      page,
      limit,
      academicYearId: academicYearId ?? '',
      termNumber: termNumber ?? '',
    });
    const cached = await this.cacheService.getCachedAggregate<
      Awaited<ReturnType<HODContextService['getDepartmentProgress']>>
    >('hod:dept-progress', cacheKey);
    if (cached) return cached;

    // staffProfile + term lookup are independent → run in parallel.
    const [staffProfile, targetTerm] = await Promise.all([
      this.prisma.staffProfile.findUnique({ where: { userId } }),
      (async () => {
        let term = null;
        if (academicYearId && termNumber) {
          term = await this.prisma.term.findFirst({
            where: { academicYearId, termNumber: termNumber as any },
          });
        }
        if (!term) {
          term = await this.prisma.term.findFirst({
            where: { isActive: true },
            orderBy: { startDate: 'desc' },
          });
        }
        return term;
      })(),
    ]);
    if (!staffProfile) throw new NotFoundException('HOD profile not found');

    // Fetch teaching assignments directly by department (no separate
    // subject list round-trip), then derive subjectIds from the result.
    const teachingAssignments = await this.prisma.teachingAssignment.findMany({
      where: { subject: { departmentId: staffProfile.departmentId } },
      include: { classSection: true },
    });
    const subjectIds = Array.from(
      new Set(teachingAssignments.map((ta) => ta.subjectId)),
    );

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
    const classIds = paginatedClasses.map((c) => c.id);

    // ── Aggregated queries (replaces the per-class N+1 loop) ──────────────
    // Previously this method ran ~7 queries *per class* (up to 350+ for a
    // 50-class page). The block below fetches every required metric in a
    // small fixed number of queries, then distributes the results by class
    // in memory — keeping the exact response shape unchanged.
    const students = await this.prisma.studentProfile.findMany({
      where: { currentClassId: { in: classIds }, archivedAt: null },
      select: { id: true, currentClassId: true },
    });

    const studentIdsByClass = new Map<string, string[]>();
    const studentCountByClass = new Map<string, number>();
    const allStudentIds: string[] = [];
    for (const s of students) {
      if (!s.currentClassId) continue;
      const arr = studentIdsByClass.get(s.currentClassId) ?? [];
      arr.push(s.id);
      studentIdsByClass.set(s.currentClassId, arr);
      studentCountByClass.set(
        s.currentClassId,
        (studentCountByClass.get(s.currentClassId) ?? 0) + 1,
      );
      allStudentIds.push(s.id);
    }

    // gradeAgg + attAgg are independent and both depend only on allStudentIds
    // → fetch them concurrently.
    const [gradeAgg, attAgg] = await Promise.all([
      allStudentIds.length
        ? this.prisma.gradeEntry.groupBy({
            by: ['studentId', 'isApproved', 'isLocked', 'submittedById', 'hasObservation'],
            where: {
              studentId: { in: allStudentIds },
              termId: targetTerm?.id,
              subjectId: { in: subjectIds },
            },
            _count: { _all: true },
          })
        : Promise.resolve([] as any[]),
      allStudentIds.length
        ? this.prisma.attendanceRecord.groupBy({
            by: ['studentId'],
            where: { studentId: { in: allStudentIds }, termId: targetTerm?.id },
            _count: { _all: true },
          })
        : Promise.resolve([] as any[]),
    ]);
    const attByStudent = new Map<string, number>();
    for (const row of attAgg) {
      attByStudent.set(row.studentId, row._count._all);
    }

    const gradeByStudent = new Map<
      string,
      { approved: number; locked: number; total: number; signed: number; observed: number }
    >();
    for (const row of gradeAgg) {
      const cur =
        gradeByStudent.get(row.studentId) ??
        { approved: 0, locked: 0, total: 0, signed: 0, observed: 0 };
      cur.total += row._count._all;
      if (row.isApproved) cur.approved += row._count._all;
      if (row.isLocked) cur.locked += row._count._all;
      if (row.submittedById !== null) cur.signed += row._count._all;
      if (row.hasObservation) cur.observed += row._count._all;
      gradeByStudent.set(row.studentId, cur);
    }

    const classIdByStudent = new Map<string, string>();
    for (const s of students) {
      if (s.currentClassId) classIdByStudent.set(s.id, s.currentClassId);
    }

    const gradeEntries = allStudentIds.length
      ? await this.prisma.gradeEntry.findMany({
          where: {
            studentId: { in: allStudentIds },
            termId: targetTerm?.id,
            subjectId: { in: subjectIds },
          },
          include: {
            subject: { select: { id: true, name: true } },
            student: {
              select: { id: true, firstName: true, lastName: true, indexNumber: true },
            },
          },
        })
      : [];

    const subjectsByStudent = new Map<string, any[]>();
    for (const ge of gradeEntries) {
      const arr = subjectsByStudent.get(ge.studentId) ?? [];
      arr.push({
        id: ge.id,
        subject: ge.subject?.name || 'Unknown',
        sba: ge.classScore ?? null,
        exam: ge.examScore ?? null,
        final: ge.totalScore ?? null,
        grade: ge.grade ?? null,
        progress: ge.totalScore != null ? 100 : 0,
        status: ge.isLocked ? 'LOCKED' : ge.isApproved ? 'APPROVED' : 'PENDING',
      });
      subjectsByStudent.set(ge.studentId, arr);
    }

    const studentInfo = new Map<string, any>();
    for (const ge of gradeEntries) {
      if (studentInfo.has(ge.studentId)) continue;
      const st = ge.student;
      studentInfo.set(ge.studentId, {
        id: ge.studentId,
        name: st ? `${st.firstName} ${st.lastName}` : 'Unknown',
        indexNumber: st?.indexNumber || '',
        className: classIdByStudent.get(ge.studentId)
          ? classMap.get(classIdByStudent.get(ge.studentId))?.name || ''
          : '',
        status: 'PENDING',
      });
    }

    const studentsByClass = new Map<string, any[]>();
    for (const [studentId, info] of studentInfo) {
      const cid = classIdByStudent.get(studentId);
      if (!cid) continue;
      const arr = studentsByClass.get(cid) ?? [];
      arr.push({ ...info, subjects: subjectsByStudent.get(studentId) || [] });
      studentsByClass.set(cid, arr);
    }

    const termLocked = targetTerm?.isLocked ?? false;

    const items = paginatedClasses.map((classSection) => {
      const studentIds = studentIdsByClass.get(classSection.id) ?? [];
      const studentCount = studentCountByClass.get(classSection.id) ?? 0;

      let progress = 0;
      let isClassFullyLocked = false;
      let gradePct = 0;
      let attendancePct = 0;
      let signOffPct = 0;
      let observationPct = 0;

      if (targetTerm && studentIds.length > 0) {
        let approvedCount = 0;
        let lockedCount = 0;
        let totalEntriesCount = 0;
        let signedEntries = 0;
        let observationsRecorded = 0;
        let attendanceRecords = 0;

        for (const sid of studentIds) {
          const g = gradeByStudent.get(sid);
          if (g) {
            approvedCount += g.approved;
            lockedCount += g.locked;
            totalEntriesCount += g.total;
            signedEntries += g.signed;
            observationsRecorded += g.observed;
          }
          attendanceRecords += attByStudent.get(sid) ?? 0;
        }

        const totalCount = subjectIds.length * studentIds.length;
        const totalAttendance = studentIds.length * 60;
        gradePct =
          totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
        attendancePct =
          totalAttendance > 0
            ? Math.round((attendanceRecords / totalAttendance) * 100)
            : 0;
        signOffPct =
          totalCount > 0 ? Math.round((signedEntries / totalCount) * 100) : 0;
        observationPct =
          totalCount > 0
            ? Math.round((observationsRecorded / totalCount) * 100)
            : 0;
        progress = Math.min(gradePct, attendancePct, signOffPct, observationPct);
        isClassFullyLocked =
          totalEntriesCount > 0 && lockedCount === totalEntriesCount;
      }

      return {
        id: classSection.id,
        className: classSection.name,
        level: classSection.level,
        studentCount,
        progress,
        submissionPct: progress,
        status:
          isClassFullyLocked || termLocked
            ? 'LOCKED'
            : progress === 100
              ? 'COMPLETE'
              : 'PENDING',
        termId: targetTerm?.id || null,
        students: studentsByClass.get(classSection.id) || [],
        checks: [
          { pass: gradePct > 0, label: 'Grade entries recorded' },
          { pass: attendancePct >= 90, label: 'Attendance above 90%' },
          { pass: signOffPct === 100, label: 'Teacher sign-off complete' },
          { pass: observationPct === 100, label: 'Observations recorded' },
          { pass: progress === 100, label: 'Ready for seal' },
        ],
      };
    });

    const result = {
      items,
      total: departmentClasses.length,
      page,
      limit,
      pages: Math.ceil(departmentClasses.length / limit),
    };

    await this.cacheService.setCachedAggregate(
      'hod:dept-progress',
      cacheKey,
      result,
      300,
    );

    return result;
  }

  private getCacheKey(method: string, params: Record<string, unknown>): string {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(params).sort()) {
      const value = params[key];
      normalized[key] = value === undefined ? '' : value;
    }
    return `${method}:${JSON.stringify(normalized)}`;
  }
}

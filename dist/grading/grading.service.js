"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const interventions_service_1 = require("../interventions/interventions.service");
const GRADE_BOUNDARIES = [
    {
        grade: 'A1',
        min: 80,
        max: 100,
        remark: client_1.GradeRemark.EXCELLENT,
        smartRemarks: [
            'Outstanding performance',
            'Exceptional academic achievement',
            'An excellent student — keep it up!',
        ],
    },
    {
        grade: 'B2',
        min: 70,
        max: 79,
        remark: client_1.GradeRemark.VERY_GOOD,
        smartRemarks: [
            'Very good performance',
            'Great effort shown',
            'Well done — aim for the top!',
        ],
    },
    {
        grade: 'B3',
        min: 65,
        max: 69,
        remark: client_1.GradeRemark.GOOD,
        smartRemarks: [
            'Good performance',
            'Commendable effort',
            'Keep pushing for excellence',
        ],
    },
    {
        grade: 'C4',
        min: 60,
        max: 64,
        remark: client_1.GradeRemark.CREDIT,
        smartRemarks: [
            'Credit performance',
            'Good but can do better',
            'Consistent effort required',
        ],
    },
    {
        grade: 'C5',
        min: 55,
        max: 59,
        remark: client_1.GradeRemark.PASS,
        smartRemarks: [
            'Can do better with more effort',
            'More dedication needed',
            'Revise frequently',
        ],
    },
    {
        grade: 'C6',
        min: 50,
        max: 54,
        remark: client_1.GradeRemark.PASS,
        smartRemarks: [
            'Satisfactory — more work needed',
            'Pay closer attention in class',
        ],
    },
    {
        grade: 'D7',
        min: 45,
        max: 49,
        remark: client_1.GradeRemark.WEAK_PASS,
        smartRemarks: [
            'Weak performance — please seek help',
            'Extra classes recommended',
        ],
    },
    {
        grade: 'E8',
        min: 40,
        max: 44,
        remark: client_1.GradeRemark.WEAK_PASS,
        smartRemarks: [
            'Very weak — urgent improvement needed',
            'Must attend remedial sessions',
        ],
    },
    {
        grade: 'F9',
        min: 0,
        max: 39,
        remark: client_1.GradeRemark.FAILURE,
        smartRemarks: [
            'Failed — must repeat this subject',
            'Serious academic counselling required',
        ],
    },
];
let GradingService = class GradingService {
    constructor(prisma, interventionsService) {
        this.prisma = prisma;
        this.interventionsService = interventionsService;
    }
    computeGrade(classScore, examScore) {
        const total = Math.round(classScore + examScore);
        const boundary = GRADE_BOUNDARIES.find((b) => total >= b.min && total <= b.max) ||
            GRADE_BOUNDARIES[GRADE_BOUNDARIES.length - 1];
        if (total > 100) {
            return {
                totalScore: total,
                grade: GRADE_BOUNDARIES[0].grade,
                remark: GRADE_BOUNDARIES[0].remark,
                smartRemarks: GRADE_BOUNDARIES[0].smartRemarks,
            };
        }
        return {
            totalScore: total,
            grade: boundary.grade,
            remark: boundary.remark,
            smartRemarks: boundary.smartRemarks,
        };
    }
    getSmartRemarks(grade) {
        return GRADE_BOUNDARIES.find((b) => b.grade === grade)?.smartRemarks ?? [];
    }
    async upsertGrade(dto, submittedById) {
        const term = await this.prisma.term.findUniqueOrThrow({
            where: { id: dto.termId },
        });
        if (term.isLocked) {
            throw new common_1.ForbiddenException('Term is locked. Grades cannot be modified.');
        }
        let totalScore;
        let grade;
        if (dto.classScore !== undefined && dto.examScore !== undefined) {
            const computed = this.computeGrade(dto.classScore, dto.examScore);
            totalScore = computed.totalScore;
            grade = computed.grade;
        }
        const existing = await this.prisma.gradeEntry.findFirst({
            where: {
                studentId: dto.studentId,
                subjectId: dto.subjectId,
                termId: dto.termId,
            },
            select: { classScore: true, examScore: true, totalScore: true, grade: true },
        });
        const entry = await this.prisma.gradeEntry.upsert({
            where: {
                studentId_subjectId_termId: {
                    studentId: dto.studentId,
                    subjectId: dto.subjectId,
                    termId: dto.termId,
                },
            },
            create: {
                studentId: dto.studentId,
                subjectId: dto.subjectId,
                termId: dto.termId,
                classScore: dto.classScore,
                examScore: dto.examScore,
                totalScore,
                grade,
                remark: dto.remark,
                hasObservation: dto.hasObservation ?? false,
                observationText: dto.observationText,
                submittedById,
                submittedAt: new Date(),
                isApproved: false,
            },
            update: {
                classScore: dto.classScore,
                examScore: dto.examScore,
                totalScore,
                grade,
                remark: dto.remark,
                hasObservation: dto.hasObservation,
                observationText: dto.observationText,
                submittedById,
                submittedAt: new Date(),
                isApproved: false,
            },
            include: { student: true, subject: true },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: submittedById,
                action: existing ? client_1.AuditAction.UPDATE : client_1.AuditAction.CREATE,
                entity: 'GradeEntry',
                entityId: entry.id,
                payload: {
                    studentId: dto.studentId,
                    subjectId: dto.subjectId,
                    termId: dto.termId,
                    oldValue: existing
                        ? { classScore: existing.classScore, examScore: existing.examScore, totalScore: existing.totalScore, grade: existing.grade }
                        : null,
                    newValue: { classScore: dto.classScore, examScore: dto.examScore, totalScore, grade },
                    justification: null,
                },
            },
        });
        const previousTermId = await this.getPreviousTermId(dto.termId);
        if (previousTermId) {
            try {
                await this.interventionsService.checkPerformanceDrop(dto.studentId, dto.termId, previousTermId);
            }
            catch {
            }
        }
        return entry;
    }
    async getPreviousTermId(currentTermId) {
        const currentTerm = await this.prisma.term.findUniqueOrThrow({
            where: { id: currentTermId },
            select: { academicYearId: true, termNumber: true },
        });
        const termOrder = {
            TERM_1: 1,
            TERM_2: 2,
            TERM_3: 3,
        };
        const currentNum = termOrder[currentTerm.termNumber];
        const candidates = await this.prisma.term.findMany({
            where: { academicYearId: currentTerm.academicYearId },
            orderBy: { termNumber: 'desc' },
        });
        for (const t of candidates) {
            if (termOrder[t.termNumber] < currentNum) {
                return t.id;
            }
        }
        const prevYear = await this.prisma.academicYear.findFirst({
            where: { id: { not: currentTerm.academicYearId } },
            orderBy: { startDate: 'desc' },
        });
        if (!prevYear)
            return null;
        const prevYearTerms = await this.prisma.term.findMany({
            where: { academicYearId: prevYear.id },
            orderBy: { termNumber: 'desc' },
        });
        return prevYearTerms[0]?.id ?? null;
    }
    async approveGrade(gradeEntryId, approvedById, userRole) {
        if (userRole !== client_1.Role.HOD &&
            userRole !== client_1.Role.HEADMASTER &&
            userRole !== client_1.Role.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Only HODs or above can approve grade entries');
        }
        const entry = await this.prisma.gradeEntry.update({
            where: { id: gradeEntryId },
            data: { isApproved: true, approvedById, approvedAt: new Date() },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: approvedById,
                action: client_1.AuditAction.UPDATE,
                entity: 'GradeEntry',
                entityId: gradeEntryId,
                payload: {
                    oldValue: { isApproved: false },
                    newValue: { isApproved: true, approvedAt: new Date().toISOString() },
                },
            },
        });
        return entry;
    }
    async bulkApproveGrades(ids, approvedById, userRole) {
        if (userRole !== client_1.Role.HOD &&
            userRole !== client_1.Role.HEADMASTER &&
            userRole !== client_1.Role.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Only HODs or above can approve grade entries');
        }
        const result = await this.prisma.gradeEntry.updateMany({
            where: { id: { in: ids } },
            data: { isApproved: true, approvedById, approvedAt: new Date() },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: approvedById,
                action: client_1.AuditAction.UPDATE,
                entity: 'GradeEntry',
                entityId: ids[0] || 'bulk',
                payload: {
                    approvedCount: result.count,
                    ids,
                },
            },
        });
        return result;
    }
    async getClassPerformanceSummary(classId, termId, userId, userRole) {
        if (userRole === client_1.Role.TEACHER && userId) {
            const staffProfile = await this.prisma.staffProfile.findUnique({
                where: { userId },
            });
            if (!staffProfile) {
                throw new common_1.ForbiddenException('Teacher profile not found');
            }
            const isAssigned = await this.prisma.teachingAssignment.findFirst({
                where: {
                    teacherId: staffProfile.id,
                    classSectionId: classId,
                },
            });
            if (!isAssigned) {
                throw new common_1.ForbiddenException('You are not assigned to this class');
            }
        }
        const students = await this.prisma.studentProfile.findMany({
            where: { currentClassId: classId },
            include: {
                grades: {
                    where: { termId },
                    include: { subject: true },
                },
            },
        });
        return students.map((s) => {
            const totalGrades = s.grades.length;
            const approvedGrades = s.grades.filter((g) => g.isApproved).length;
            const progress = totalGrades > 0 ? (approvedGrades / totalGrades) * 100 : 0;
            return {
                id: s.id,
                name: `${s.firstName} ${s.lastName}`,
                indexNumber: s.indexNumber,
                progress,
                isFullyApproved: totalGrades > 0 && totalGrades === approvedGrades,
                gradesCount: totalGrades,
            };
        });
    }
    async lockGrade(gradeEntryId, lockedById, userRole) {
        if (userRole !== client_1.Role.HOD &&
            userRole !== client_1.Role.HEADMASTER &&
            userRole !== client_1.Role.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Only HODs or above can lock grade entries');
        }
        const updated = await this.prisma.gradeEntry.update({
            where: { id: gradeEntryId },
            data: { isLocked: true, lockedById, lockedAt: new Date() },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: lockedById,
                action: client_1.AuditAction.LOCK,
                entity: 'GradeEntry',
                entityId: gradeEntryId,
                payload: { gradeEntryId, lockedById },
            },
        });
        return updated;
    }
    async correctGrade(dto, changedById) {
        const entry = await this.prisma.gradeEntry.findUniqueOrThrow({
            where: { id: dto.gradeEntryId },
        });
        if (entry.isLocked) {
            throw new common_1.ForbiddenException('Grade is locked. Contact HOD to unlock.');
        }
        const oldValue = String(entry[dto.fieldChanged] ?? '');
        await this.prisma.gradeCorrection.create({
            data: {
                gradeEntryId: dto.gradeEntryId,
                changedById,
                fieldChanged: dto.fieldChanged,
                oldValue,
                newValue: dto.newValue,
                reason: dto.reason,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: changedById,
                action: client_1.AuditAction.GRADE_CORRECTION,
                entity: 'GradeEntry',
                entityId: dto.gradeEntryId,
                payload: {
                    fieldChanged: dto.fieldChanged,
                    oldValue,
                    newValue: dto.newValue,
                    justification: dto.reason,
                },
            },
        });
        const updateData = {
            [dto.fieldChanged]: dto.fieldChanged === 'remark' ? dto.newValue : parseFloat(dto.newValue),
        };
        if (dto.fieldChanged === 'classScore' || dto.fieldChanged === 'examScore') {
            const cs = dto.fieldChanged === 'classScore'
                ? parseFloat(dto.newValue)
                : (entry.classScore ?? 0);
            const es = dto.fieldChanged === 'examScore'
                ? parseFloat(dto.newValue)
                : (entry.examScore ?? 0);
            const computed = this.computeGrade(cs, es);
            updateData.totalScore = computed.totalScore;
            updateData.grade = computed.grade;
        }
        return this.prisma.gradeEntry.update({
            where: { id: dto.gradeEntryId },
            data: updateData,
        });
    }
    async getTeacherSubjectIds(userId) {
        if (!userId)
            return [];
        const staffProfile = await this.prisma.staffProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!staffProfile) {
            throw new common_1.ForbiddenException('Teacher profile not found');
        }
        const assignments = await this.prisma.teachingAssignment.findMany({
            where: { teacherId: staffProfile.id },
            select: { subjectId: true },
        });
        return assignments.map((assignment) => assignment.subjectId);
    }
    async getEffectiveTermId(termId) {
        if (termId)
            return termId;
        const activeTerm = await this.prisma.term.findFirst({
            where: { isActive: true },
            orderBy: { startDate: 'desc' },
            select: { id: true },
        });
        if (activeTerm)
            return activeTerm.id;
        const latestTerm = await this.prisma.term.findFirst({
            orderBy: { startDate: 'desc' },
            select: { id: true },
        });
        return latestTerm?.id;
    }
    async getTeacherNameMap(userIds) {
        const ids = [...new Set(userIds.filter(Boolean))];
        if (ids.length === 0)
            return new Map();
        const staffProfiles = await this.prisma.staffProfile.findMany({
            where: { userId: { in: ids } },
            select: { userId: true, firstName: true, lastName: true },
        });
        return new Map(staffProfiles.map((staff) => [
            staff.userId,
            `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
        ]));
    }
    toObservation(entry, teacher = 'Unknown') {
        return {
            id: entry.id,
            student: entry.student
                ? `${entry.student.firstName || ''} ${entry.student.lastName || ''}`.trim()
                : 'Unknown',
            index: entry.student?.indexNumber || '',
            class: entry.student?.currentClass?.name || 'Unknown Class',
            teacher,
            type: entry.subject?.name || 'Unknown Subject',
            comment: entry.observationText || entry.remark || '',
            status: entry.hasObservation ? 'Logged' : 'Missing',
            date: entry.updatedAt
                ? entry.updatedAt.toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
        };
    }
    async getMissingObservationsTray(termId, userId, userRole) {
        const effectiveTermId = await this.getEffectiveTermId(termId);
        if (!effectiveTermId)
            return [];
        const whereClause = {
            termId: effectiveTermId,
            hasObservation: false,
            OR: [{ classScore: { not: null } }, { examScore: { not: null } }],
        };
        if (userRole === client_1.Role.TEACHER && userId) {
            const subjectIds = await this.getTeacherSubjectIds(userId);
            if (subjectIds.length > 0) {
                whereClause.subjectId = { in: subjectIds };
            }
        }
        const entries = await this.prisma.gradeEntry.findMany({
            where: whereClause,
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
        const teacherMap = await this.getTeacherNameMap(entries.map((entry) => entry.submittedById));
        return entries.map((entry) => ({
            ...this.toObservation(entry, entry.submittedById
                ? teacherMap.get(entry.submittedById) || 'Unknown'
                : 'Unknown'),
            status: 'Missing',
        }));
    }
    async getObservationLogs(userId, userRole) {
        const whereClause = {};
        if (userRole === client_1.Role.TEACHER && userId) {
            const subjectIds = await this.getTeacherSubjectIds(userId);
            if (subjectIds.length === 0)
                return [];
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
                        currentClass: { select: { name: true } },
                    },
                },
                subject: { select: { name: true, code: true } },
            },
            orderBy: [{ hasObservation: 'desc' }, { updatedAt: 'desc' }],
        });
        const teacherMap = await this.getTeacherNameMap(entries.map((entry) => entry.submittedById));
        return entries.map((entry) => this.toObservation(entry, entry.submittedById
            ? teacherMap.get(entry.submittedById) || 'Unknown'
            : 'Unknown'));
    }
    async assertObservationAccess(entry, userId, userRole) {
        if (userRole !== client_1.Role.TEACHER || !userId)
            return;
        const subjectIds = await this.getTeacherSubjectIds(userId);
        if (!subjectIds.includes(entry.subjectId)) {
            throw new common_1.ForbiddenException('You can only access your assigned observations');
        }
    }
    async resolveObservationGradeEntry(body) {
        if (body.gradeEntryId) {
            return this.prisma.gradeEntry.findUnique({
                where: { id: body.gradeEntryId },
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
            });
        }
        const activeTermId = await this.getEffectiveTermId();
        if (!activeTermId)
            return null;
        const student = await this.prisma.studentProfile.findFirst({
            where: {
                indexNumber: body.index || body.studentIndex,
                currentClass: { name: body.class || body.className },
            },
            select: { id: true },
        });
        const subject = await this.prisma.subject.findFirst({
            where: { name: body.type || body.subject || body.subjectName },
            select: { id: true },
        });
        if (!student || !subject)
            return null;
        return this.prisma.gradeEntry.findUnique({
            where: {
                studentId_subjectId_termId: {
                    studentId: student.id,
                    subjectId: subject.id,
                    termId: activeTermId,
                },
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
        });
    }
    async createObservation(body, userId, userRole) {
        const comment = body.comment || body.observationText || '';
        const entry = await this.resolveObservationGradeEntry(body);
        if (!entry) {
            throw new common_1.NotFoundException('Grade entry matching observation not found');
        }
        await this.assertObservationAccess(entry, userId, userRole);
        const updated = await this.prisma.gradeEntry.update({
            where: { id: entry.id },
            data: {
                hasObservation: true,
                observationText: comment,
                remark: comment,
                submittedById: userId,
                submittedAt: new Date(),
                isApproved: false,
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
        });
        const teacherMap = await this.getTeacherNameMap([userId]);
        return this.toObservation(updated, teacherMap.get(userId) || 'Unknown');
    }
    async updateObservation(observationId, body, userId, userRole) {
        const entry = await this.prisma.gradeEntry.findUnique({
            where: { id: observationId },
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
        });
        if (!entry) {
            throw new common_1.NotFoundException('Observation not found');
        }
        await this.assertObservationAccess(entry, userId, userRole);
        const data = {
            hasObservation: body.hasObservation ?? true,
            submittedById: userId,
            submittedAt: new Date(),
            isApproved: false,
        };
        if (body.comment !== undefined || body.observationText !== undefined) {
            const comment = body.comment ?? body.observationText ?? '';
            data.observationText = comment;
            data.remark = comment;
        }
        const updated = await this.prisma.gradeEntry.update({
            where: { id: observationId },
            data,
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
        });
        const teacherMap = await this.getTeacherNameMap([userId]);
        return this.toObservation(updated, teacherMap.get(userId) || 'Unknown');
    }
    async deleteObservation(observationId, userId, userRole) {
        const entry = await this.prisma.gradeEntry.findUnique({
            where: { id: observationId },
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
        });
        if (!entry) {
            throw new common_1.NotFoundException('Observation not found');
        }
        await this.assertObservationAccess(entry, userId, userRole);
        const updated = await this.prisma.gradeEntry.update({
            where: { id: observationId },
            data: {
                hasObservation: false,
                observationText: null,
                submittedById: userId,
                submittedAt: new Date(),
                isApproved: false,
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
        });
        const teacherMap = await this.getTeacherNameMap([userId]);
        return this.toObservation(updated, teacherMap.get(userId) || 'Unknown');
    }
    async getStudentTermGrades(studentId, termId, userRole) {
        const where = { studentId, termId };
        if (userRole === client_1.Role.STUDENT) {
            where.isApproved = true;
        }
        return this.prisma.gradeEntry.findMany({
            where,
            include: { subject: true, corrections: true },
            orderBy: { subject: { name: 'asc' } },
        });
    }
    async bulkUpsertGrades(entries, submittedById) {
        const results = await Promise.all(entries.map((e) => this.upsertGrade(e, submittedById)));
        if (entries.length > 0) {
            const { subjectId, termId } = entries[0];
            await this.computeSubjectPositions(subjectId, termId);
        }
        return results;
    }
    async computeSubjectPositions(subjectId, termId) {
        const entries = await this.prisma.gradeEntry.findMany({
            where: { subjectId, termId, totalScore: { not: null } },
            orderBy: { totalScore: 'desc' },
        });
        let currentRank = 1;
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (i > 0 && entry.totalScore === entries[i - 1].totalScore) {
            }
            else {
                currentRank = i + 1;
            }
            await this.prisma.gradeEntry.update({
                where: { id: entry.id },
                data: { position: currentRank },
            });
        }
    }
    async getStudentsForGrading(subjectId, classId, termId, userId, userRole) {
        const effectiveTermId = await this.getEffectiveTermId(termId);
        if (!subjectId || !classId || !effectiveTermId) {
            return [];
        }
        let teacherId;
        if (userRole === client_1.Role.TEACHER) {
            const staffProfile = await this.prisma.staffProfile.findUnique({
                where: { userId },
                select: { id: true },
            });
            teacherId = staffProfile?.id;
        }
        const isAssigned = teacherId
            ? !!(await this.prisma.teachingAssignment.findFirst({
                where: { teacherId, subjectId, classSectionId: classId },
            }))
            : true;
        if (userRole !== client_1.Role.SUPER_ADMIN &&
            userRole !== client_1.Role.HEADMASTER &&
            !isAssigned) {
            return [];
        }
        const [students, gradeEntries] = await Promise.all([
            this.prisma.studentProfile.findMany({
                where: { currentClassId: classId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    indexNumber: true,
                },
                orderBy: { lastName: 'asc' },
            }),
            this.prisma.gradeEntry.findMany({
                where: { subjectId, termId: effectiveTermId },
                select: {
                    studentId: true,
                    classScore: true,
                    examScore: true,
                    totalScore: true,
                    grade: true,
                    remark: true,
                    hasObservation: true,
                },
            }),
        ]);
        const gradeMap = new Map(gradeEntries.map((g) => [g.studentId, g]));
        return students.map((s) => {
            const g = gradeMap.get(s.id);
            let auditStatus;
            if (g === undefined) {
                auditStatus = undefined;
            }
            else if (g.hasObservation) {
                auditStatus = 'COMPLETE';
            }
            else {
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
    async getComplianceWarnings(userId, role) {
        if (role !== client_1.Role.HEADMASTER &&
            role !== client_1.Role.SUPER_ADMIN &&
            role !== client_1.Role.HOD) {
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        const warnings = [];
        const activeTerm = await this.prisma.term.findFirst({
            where: { isActive: true },
        });
        if (!activeTerm) {
            warnings.push({
                severity: 'high',
                msg: 'No active term found. Term initialization required.',
            });
            return warnings;
        }
        const incompleteEntries = await this.prisma.gradeEntry.count({
            where: {
                termId: activeTerm.id,
                OR: [{ totalScore: null }, { remark: null }],
            },
        });
        if (incompleteEntries > 0) {
            warnings.push({
                severity: 'high',
                msg: `${incompleteEntries} grade entries have missing scores or remarks.`,
            });
        }
        const lockedTerm = await this.prisma.term.findFirst({
            where: { id: activeTerm.id, isLocked: true },
        });
        if (lockedTerm) {
            warnings.push({
                severity: 'medium',
                msg: 'Active term is locked. Modifications require emergency unlock.',
            });
        }
        const unapprovedEntries = await this.prisma.gradeEntry.count({
            where: {
                termId: activeTerm.id,
                isLocked: true,
                isApproved: false,
            },
        });
        if (unapprovedEntries > 0) {
            warnings.push({
                severity: 'low',
                msg: `${unapprovedEntries} locked entries await final sign-off.`,
            });
        }
        return warnings;
    }
};
exports.GradingService = GradingService;
exports.GradingService = GradingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        interventions_service_1.InterventionsService])
], GradingService);
//# sourceMappingURL=grading.service.js.map
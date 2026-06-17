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
    constructor(prisma) {
        this.prisma = prisma;
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
        return entry;
    }
    async approveGrade(gradeEntryId, approvedById, userRole) {
        if (userRole !== client_1.Role.HOD &&
            userRole !== client_1.Role.HEADMASTER &&
            userRole !== client_1.Role.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Only HODs or above can approve grade entries');
        }
        return this.prisma.gradeEntry.update({
            where: { id: gradeEntryId },
            data: { isApproved: true, approvedById, approvedAt: new Date() },
        });
    }
    async bulkApproveGrades(ids, approvedById, userRole) {
        if (userRole !== client_1.Role.HOD &&
            userRole !== client_1.Role.HEADMASTER &&
            userRole !== client_1.Role.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Only HODs or above can approve grade entries');
        }
        return this.prisma.gradeEntry.updateMany({
            where: { id: { in: ids } },
            data: { isApproved: true, approvedById, approvedAt: new Date() },
        });
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
        return this.prisma.gradeEntry.update({
            where: { id: gradeEntryId },
            data: { isLocked: true, lockedById, lockedAt: new Date() },
        });
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
    async getMissingObservationsTray(termId, userId, userRole) {
        const whereClause = {
            termId,
            hasObservation: false,
            OR: [{ classScore: { not: null } }, { examScore: { not: null } }],
        };
        if (userRole === client_1.Role.TEACHER && userId) {
            const staffProfile = await this.prisma.staffProfile.findUnique({
                where: { userId },
            });
            if (!staffProfile) {
                throw new common_1.ForbiddenException('Teacher profile not found');
            }
            const teacherAssignments = await this.prisma.teachingAssignment.findMany({
                where: { teacherId: staffProfile.id },
                select: { subjectId: true },
            });
            const subjectIds = teacherAssignments.map((a) => a.subjectId);
            if (subjectIds.length > 0) {
                whereClause.subjectId = { in: subjectIds };
            }
        }
        return this.prisma.gradeEntry.findMany({
            where: whereClause,
            include: {
                student: {
                    select: { indexNumber: true, firstName: true, lastName: true },
                },
                subject: { select: { name: true, code: true } },
            },
            orderBy: { student: { lastName: 'asc' } },
        });
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
};
exports.GradingService = GradingService;
exports.GradingService = GradingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GradingService);
//# sourceMappingURL=grading.service.js.map
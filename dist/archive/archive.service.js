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
exports.ArchiveService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const PROMOTION_MAP = {
    [client_1.ClassLevel.FORM_1]: client_1.ClassLevel.FORM_2,
    [client_1.ClassLevel.FORM_2]: client_1.ClassLevel.FORM_3,
    [client_1.ClassLevel.FORM_3]: null,
};
let ArchiveService = class ArchiveService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async runPromotionCycle(academicYearId, performedById, studentId, classId) {
        let yearLabel = null;
        let resolvedYearId = academicYearId;
        const needsYearLookup = !resolvedYearId;
        if (needsYearLookup) {
            try {
                const activeYear = await this.prisma.academicYear.findFirst({
                    where: { isActive: true },
                });
                resolvedYearId = activeYear?.id;
                yearLabel = activeYear?.label || null;
            }
            catch {
                resolvedYearId = null;
                yearLabel = null;
            }
        }
        else {
            const year = await this.prisma.academicYear.findUniqueOrThrow({
                where: { id: academicYearId },
            });
            yearLabel = year.label;
            const unlockedTerms = await this.prisma.term.findMany({
                where: { academicYearId, isLocked: false },
            });
            if (unlockedTerms.length > 0) {
                throw new common_1.BadRequestException(`${unlockedTerms.length} term(s) are still unlocked. Lock all terms before running promotion.`);
            }
        }
        let students = await this.prisma.studentProfile.findMany({
            where: { archivedAt: null, currentClassId: { not: null } },
            include: { currentClass: true },
        });
        const totalCount = students.length;
        if (studentId) {
            students = students.filter((s) => s.id === studentId);
        }
        if (classId) {
            students = students.filter((s) => s.currentClassId === classId);
        }
        const promotionRecords = [];
        const graduates = [];
        for (const student of students) {
            const currentLevel = student.currentClass.level;
            const nextLevel = PROMOTION_MAP[currentLevel];
            if (nextLevel === null) {
                graduates.push(student.id);
                promotionRecords.push({
                    studentId: student.id,
                    academicYearId: resolvedYearId,
                    fromClass: currentLevel,
                    toClass: null,
                    status: 'GRADUATED',
                    performedById: performedById || '',
                });
            }
            else {
                const currentClassName = student.currentClass.name;
                const suffix = currentClassName.replace(/^[1-3]/, '');
                const nextClass = await this.prisma.classSection.findFirst({
                    where: {
                        level: nextLevel,
                        name: { endsWith: suffix },
                    },
                });
                if (nextClass) {
                    await this.prisma.studentProfile.update({
                        where: { id: student.id },
                        data: { currentClassId: nextClass.id },
                    });
                }
                promotionRecords.push({
                    studentId: student.id,
                    academicYearId: resolvedYearId,
                    fromClass: currentLevel,
                    toClass: nextLevel,
                    status: 'PROMOTED',
                    performedById: performedById || '',
                });
            }
        }
        await this.prisma.studentProfile.updateMany({
            where: { id: { in: graduates } },
            data: { archivedAt: new Date(), currentClassId: null },
        });
        if (resolvedYearId) {
            await this.prisma.promotionRecord.createMany({ data: promotionRecords });
        }
        return {
            academicYear: yearLabel,
            totalProcessed: totalCount,
            promoted: promotionRecords.filter((r) => r.status === 'PROMOTED').length,
            graduated: graduates.length,
        };
    }
    async searchVault(query, userId, userRole) {
        const roleFilter = {};
        if (userRole === client_1.Role.TEACHER && userId) {
            const staffProfile = await this.prisma.staffProfile.findUnique({
                where: { userId },
            });
            if (staffProfile) {
                const teacherGrades = await this.prisma.gradeEntry.findMany({
                    where: { submittedById: staffProfile.id },
                    select: { studentId: true },
                    distinct: ['studentId'],
                });
                const taughtStudentIds = teacherGrades.map((g) => g.studentId);
                if (taughtStudentIds.length > 0) {
                    roleFilter.id = { in: taughtStudentIds };
                }
                else {
                    roleFilter.id = '';
                }
            }
        }
        else if (userRole === client_1.Role.HOD && userId) {
            const staffProfile = await this.prisma.staffProfile.findUnique({
                where: { userId },
            });
            if (staffProfile) {
                roleFilter.departmentId = staffProfile.departmentId;
            }
        }
        return this.prisma.studentProfile.findMany({
            where: {
                AND: [
                    roleFilter,
                    query.indexNumber
                        ? {
                            indexNumber: {
                                contains: query.indexNumber,
                                mode: 'insensitive',
                            },
                        }
                        : {},
                    query.firstName
                        ? { firstName: { contains: query.firstName, mode: 'insensitive' } }
                        : {},
                    query.lastName
                        ? { lastName: { contains: query.lastName, mode: 'insensitive' } }
                        : {},
                ],
            },
            include: {
                grades: {
                    include: {
                        subject: true,
                        term: { include: { academicYear: true } },
                    },
                },
                reportCards: {
                    include: { term: { include: { academicYear: true } } },
                },
                promotions: {
                    include: { academicYear: true },
                },
            },
            take: 50,
        });
    }
    async lockTerm(termId) {
        return this.prisma.term.update({
            where: { id: termId },
            data: { isLocked: true },
        });
    }
    async getDatabaseHealth() {
        const [totalStudents, activeStudents, archivedStudents, totalGrades, totalReportCards, totalTranscripts, pendingObservations,] = await Promise.all([
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
    async getArchiveStats() {
        const [totalStudents, archivedStudents, totalPromotions, totalReportCards, totalTranscripts, totalDepartments, totalSubjects,] = await Promise.all([
            this.prisma.studentProfile.count(),
            this.prisma.studentProfile.count({
                where: { archivedAt: { not: null } },
            }),
            this.prisma.promotionRecord.count(),
            this.prisma.reportCard.count(),
            this.prisma.transcript.count(),
            this.prisma.department.count(),
            this.prisma.subject.count(),
        ]);
        const recentPromotions = await this.prisma.promotionRecord.findMany({
            take: 10,
            orderBy: { performedAt: 'desc' },
            include: {
                student: {
                    include: {
                        user: { select: { email: true } },
                        currentClass: true,
                    },
                },
                academicYear: true,
            },
        });
        return {
            totalStudents,
            archivedStudents,
            totalPromotions,
            totalReportCards,
            totalTranscripts,
            totalDepartments,
            totalSubjects,
            recentPromotions: recentPromotions.map((r) => ({
                id: r.id,
                studentId: r.studentId,
                studentName: `${r.student.firstName} ${r.student.lastName}`,
                studentIndex: r.student.indexNumber,
                fromClass: r.fromClass,
                toClass: r.toClass,
                status: r.status,
                academicYear: r.academicYear?.label,
                performedAt: r.performedAt,
            })),
        };
    }
};
exports.ArchiveService = ArchiveService;
exports.ArchiveService = ArchiveService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ArchiveService);
//# sourceMappingURL=archive.service.js.map
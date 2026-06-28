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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const crypto_1 = require("crypto");
const QRCode = require("qrcode");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
let ReportsService = class ReportsService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async generateReportCard(studentId, termId) {
        let targetTermId = termId;
        if (!targetTermId) {
            const latestGrade = await this.prisma.gradeEntry.findFirst({
                where: { studentId },
                orderBy: { termId: 'desc' },
                select: { termId: true },
            });
            targetTermId = latestGrade?.termId;
        }
        if (!targetTermId) {
            throw new common_1.NotFoundException('No grades found for this student');
        }
        const [student, grades, attendance] = await Promise.all([
            this.prisma.studentProfile.findUniqueOrThrow({
                where: { id: studentId },
                include: { currentClass: true, user: true },
            }),
            this.prisma.gradeEntry.findMany({
                where: { studentId, termId: targetTermId },
                include: { subject: true },
                orderBy: { subject: { name: 'asc' } },
            }),
            this.prisma.attendanceRecord.findFirst({
                where: { studentId, termId: targetTermId },
            }),
        ]);
        if (grades.length === 0) {
            throw new common_1.NotFoundException('No grades found for this student/term');
        }
        const totalScore = grades.reduce((s, g) => s + (g.totalScore ?? 0), 0);
        const averageScore = totalScore / grades.length;
        const subjectCount = grades.length;
        const canonical = JSON.stringify({
            indexNumber: student.indexNumber,
            termId: targetTermId,
            grades: grades.map((g) => ({
                subject: g.subject.code,
                total: g.totalScore,
                grade: g.grade,
            })),
            averageScore,
            generatedAt: new Date().toISOString().split('T')[0],
        });
        const systemHash = (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
        const verificationUrl = `${this.config.get('QR_BASE_URL')}/verify/${systemHash}`;
        const qrCodeUrl = await QRCode.toDataURL(verificationUrl);
        const reportCard = await this.prisma.reportCard.upsert({
            where: { studentId_termId: { studentId, termId: targetTermId } },
            create: {
                studentId,
                termId: targetTermId,
                documentType: client_1.DocumentType.REPORT_CARD,
                systemHash,
                qrCodeUrl,
                verificationUrl,
                totalScore,
                averageScore,
                classSize: 0,
                generatedAt: new Date(),
            },
            update: {
                systemHash,
                qrCodeUrl,
                verificationUrl,
                totalScore,
                averageScore,
                generatedAt: new Date(),
            },
            include: { student: true, term: { include: { academicYear: true } } },
        });
        return {
            reportCard,
            grades,
            attendance,
            student,
            statistics: { totalScore, averageScore, subjectCount },
        };
    }
    async batchGenerateReportCards(classSectionId, termId) {
        const students = await this.prisma.studentProfile.findMany({
            where: { currentClassId: classSectionId },
            select: { id: true, indexNumber: true, firstName: true, lastName: true },
        });
        const results = await Promise.allSettled(students.map((s) => this.generateReportCard(s.id, termId)));
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results
            .map((r, i) => ({ result: r, student: students[i] }))
            .filter(({ result }) => result.status === 'rejected')
            .map(({ student, result }) => ({
            studentId: student.id,
            indexNumber: student.indexNumber,
            error: result.reason?.message,
        }));
        await this.computeClassPositions(classSectionId, termId);
        return {
            total: students.length,
            succeeded,
            failedCount: failed.length,
            failed,
        };
    }
    async computeClassPositions(classSectionId, termId) {
        const reportCards = await this.prisma.reportCard.findMany({
            where: {
                termId,
                student: { currentClassId: classSectionId },
            },
            orderBy: { averageScore: 'desc' },
        });
        const classSize = reportCards.length;
        let currentRank = 1;
        for (let i = 0; i < reportCards.length; i++) {
            const rc = reportCards[i];
            if (i > 0 && rc.averageScore === reportCards[i - 1].averageScore) {
            }
            else {
                currentRank = i + 1;
            }
            await this.prisma.reportCard.update({
                where: { id: rc.id },
                data: { classPosition: currentRank, classSize },
            });
        }
    }
    async buildTranscript(studentIdOrIndex) {
        const student = await this.prisma.studentProfile.findFirst({
            where: {
                OR: [{ id: studentIdOrIndex }, { indexNumber: studentIdOrIndex }],
            },
            include: {
                user: true,
                grades: {
                    include: {
                        subject: true,
                        term: { include: { academicYear: true } },
                    },
                    orderBy: [
                        { term: { academicYear: { startDate: 'asc' } } },
                        { term: { termNumber: 'asc' } },
                    ],
                },
                reportCards: {
                    include: { term: { include: { academicYear: true } } },
                    orderBy: { term: { academicYear: { startDate: 'asc' } } },
                },
            },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        const canonical = JSON.stringify({
            indexNumber: student.indexNumber,
            grades: student.grades.map((g) => ({
                subject: g.subject.code,
                term: g.term.termNumber,
                year: g.term.academicYear.label,
                total: g.totalScore,
                grade: g.grade,
            })),
            generatedAt: new Date().toISOString(),
        });
        const systemHash = (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
        const verificationUrl = `${this.config.get('QR_BASE_URL')}/verify/transcript/${systemHash}`;
        const qrCodeUrl = await QRCode.toDataURL(verificationUrl);
        const transcript = await this.prisma.transcript.create({
            data: {
                studentId: student.id,
                indexNumber: student.indexNumber,
                systemHash,
                qrCodeUrl,
                verificationUrl: verificationUrl,
            },
        });
        return {
            transcript,
            student,
            verificationUrl,
        };
    }
    async verifyDocument(hash) {
        const [reportCard, transcript] = await Promise.all([
            this.prisma.reportCard.findUnique({
                where: { systemHash: hash },
                include: {
                    student: {
                        select: { indexNumber: true, firstName: true, lastName: true },
                    },
                    term: { include: { academicYear: true } },
                },
            }),
            this.prisma.transcript.findUnique({ where: { systemHash: hash } }),
        ]);
        if (reportCard) {
            return {
                valid: true,
                documentType: 'REPORT_CARD',
                student: reportCard.student,
                term: reportCard.term,
                generatedAt: reportCard.generatedAt,
            };
        }
        if (transcript) {
            return {
                valid: true,
                documentType: 'TRANSCRIPT',
                indexNumber: transcript.indexNumber,
                generatedAt: transcript.generatedAt,
            };
        }
        return { valid: false, message: 'Document not found in system' };
    }
    async getStudentsForGeneration(query) {
        const where = {};
        if (query.classSectionId) {
            where.currentClassId = query.classSectionId;
        }
        if (query.form) {
            const levelMap = {
                'SHS 1': client_1.ClassLevel.FORM_1,
                'SHS 2': client_1.ClassLevel.FORM_2,
                'SHS 3': client_1.ClassLevel.FORM_3,
            };
            const level = levelMap[query.form];
            if (level) {
                where.currentClass = { level };
            }
        }
        if (query.search) {
            where.OR = [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { indexNumber: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.studentProfile.findMany({
            where,
            select: {
                id: true,
                indexNumber: true,
                firstName: true,
                lastName: true,
                middleName: true,
                currentClass: { select: { id: true, name: true, level: true } },
            },
            orderBy: [{ currentClass: { level: 'asc' } }, { lastName: 'asc' }],
        });
    }
    async getBlockingIssues(classSectionId) {
        const issues = [];
        const classSection = await this.prisma.classSection.findUnique({
            where: { id: classSectionId },
            include: { teachingAssignments: true },
        });
        if (!classSection) {
            return [
                {
                    type: 'CLASS_NOT_FOUND',
                    message: 'Class section not found',
                    severity: 'HIGH',
                },
            ];
        }
        const studentCount = await this.prisma.studentProfile.count({
            where: { currentClassId: classSectionId },
        });
        if (studentCount === 0) {
            issues.push({
                type: 'NO_STUDENTS',
                message: 'No students enrolled in this class',
                severity: 'HIGH',
            });
        }
        const activeTerm = await this.prisma.term.findFirst({
            where: { isActive: true },
        });
        if (!activeTerm) {
            issues.push({
                type: 'NO_ACTIVE_TERM',
                message: 'No active term found',
                severity: 'HIGH',
            });
        }
        else {
            if (!activeTerm.isLocked) {
                issues.push({
                    type: 'TERM_NOT_LOCKED',
                    message: 'Active term is not locked',
                    severity: 'MEDIUM',
                });
            }
            const gradeCount = await this.prisma.gradeEntry.count({
                where: {
                    student: { currentClassId: classSectionId },
                    termId: activeTerm.id,
                },
            });
            const expectedGrades = studentCount * (classSection.teachingAssignments.length || 1);
            if (gradeCount < expectedGrades) {
                issues.push({
                    type: 'INCOMPLETE_GRADES',
                    message: 'Not all grade entries have been recorded for this class',
                    severity: 'HIGH',
                });
            }
            const attendanceCount = await this.prisma.attendanceRecord.count({
                where: {
                    student: { currentClassId: classSectionId },
                    termId: activeTerm.id,
                },
            });
            if (attendanceCount < studentCount) {
                issues.push({
                    type: 'MISSING_ATTENDANCE',
                    message: 'Not all students have attendance records for this term',
                    severity: 'MEDIUM',
                });
            }
        }
        return issues;
    }
    async sendNudgeToTeachers(classSectionId, message, userId) {
        const classSection = await this.prisma.classSection.findUnique({
            where: { id: classSectionId },
            include: {
                teachingAssignments: {
                    include: { teacher: true },
                },
            },
        });
        if (!classSection) {
            throw new common_1.NotFoundException('Class section not found');
        }
        const teacherIds = [
            ...new Set(classSection.teachingAssignments
                .map((ta) => ta.teacher?.id)
                .filter(Boolean)),
        ];
        const title = 'Reminder: Missing Marks';
        const body = message || `Please submit missing marks for class ${classSection.name}`;
        const notifications = await Promise.all(teacherIds.map((staffId) => this.prisma.notification.create({
            data: {
                staffId,
                title,
                body,
                channel: client_1.NotificationChannel.APP,
                createdById: userId,
            },
        })));
        return { sent: notifications.length, teacherIds };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map
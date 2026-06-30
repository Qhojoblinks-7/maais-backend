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
exports.AcademicArchitectService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let AcademicArchitectService = class AcademicArchitectService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createAcademicYear(label, startDate, endDate) {
        return this.prisma.academicYear.create({
            data: { label, startDate, endDate },
        });
    }
    async setActiveYear(yearId) {
        await this.prisma.academicYear.updateMany({ data: { isActive: false } });
        return this.prisma.academicYear.update({
            where: { id: yearId },
            data: { isActive: true },
        });
    }
    async getActiveYear() {
        return this.prisma.academicYear.findFirst({
            where: { isActive: true },
            include: { terms: { orderBy: { termNumber: 'asc' } } },
        });
    }
    async getAllYears() {
        return this.prisma.academicYear.findMany({
            orderBy: { startDate: 'desc' },
        });
    }
    async createTerm(academicYearId, termNumber, startDate, endDate) {
        return this.prisma.term.create({
            data: { academicYearId, termNumber, startDate, endDate },
        });
    }
    async setActiveTerm(termId) {
        const term = await this.prisma.term.findUniqueOrThrow({
            where: { id: termId },
        });
        await this.prisma.term.updateMany({
            where: { academicYearId: term.academicYearId },
            data: { isActive: false },
        });
        return this.prisma.term.update({
            where: { id: termId },
            data: { isActive: true },
        });
    }
    async createDepartment(name, code, description) {
        return this.prisma.department.create({ data: { name, code, description } });
    }
    async getAllDepartments() {
        return this.prisma.department.findMany({
            include: {
                staff: {
                    include: {
                        user: {
                            select: { id: true, email: true, role: true, isActive: true },
                        },
                    },
                },
                subjects: true,
                _count: { select: { staff: true, subjects: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async createSubject(dto) {
        return this.prisma.subject.create({ data: dto });
    }
    async getAllSubjects() {
        return this.prisma.subject.findMany({
            where: { isActive: true },
            include: { department: true },
            orderBy: { name: 'asc' },
        });
    }
    async createClassSection(name, level, capacity, program) {
        return this.prisma.classSection.create({ data: { name, level, capacity, program } });
    }
    async getAllClassSections() {
        return this.prisma.classSection.findMany({
            include: {
                classTeacher: true,
                _count: { select: { students: true } },
            },
            orderBy: [{ level: 'asc' }, { name: 'asc' }],
        });
    }
    async assignClassTeacher(classSectionId, staffId) {
        return this.prisma.classSection.update({
            where: { id: classSectionId },
            data: { classTeacherId: staffId },
        });
    }
    async updateClassSection(classSectionId, data) {
        return this.prisma.classSection.update({
            where: { id: classSectionId },
            data,
        });
    }
    async deleteClassSection(classSectionId) {
        return this.prisma.classSection.delete({
            where: { id: classSectionId },
        });
    }
    async assignTeacher(dto) {
        return this.prisma.teachingAssignment.create({ data: dto });
    }
    async getTeacherAssignments(teacherId) {
        return this.prisma.teachingAssignment.findMany({
            where: { teacherId },
            include: { subject: true, classSection: true },
        });
    }
    async getAssignmentsByClass(classSectionId) {
        return this.prisma.teachingAssignment.findMany({
            where: { classSectionId },
            include: {
                subject: { include: { department: true } },
                teacher: { include: { user: { select: { email: true } } } },
                classSection: true,
            },
        });
    }
};
exports.AcademicArchitectService = AcademicArchitectService;
exports.AcademicArchitectService = AcademicArchitectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AcademicArchitectService);
//# sourceMappingURL=academic-architect.service.js.map
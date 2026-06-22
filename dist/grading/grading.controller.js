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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const grading_service_1 = require("./grading.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const grading_dto_1 = require("./dto/grading.dto");
let GradingController = class GradingController {
    constructor(gradingService, prisma) {
        this.gradingService = gradingService;
        this.prisma = prisma;
    }
    upsertGrade(dto, userId) {
        return this.gradingService.upsertGrade(dto, userId);
    }
    bulkUpsert(dto, userId) {
        return this.gradingService.bulkUpsertGrades(dto.entries, userId);
    }
    lockGrade(id, userId, role) {
        return this.gradingService.lockGrade(id, userId, role);
    }
    approveGrade(id, userId, role) {
        return this.gradingService.approveGrade(id, userId, role);
    }
    bulkApprove(ids, userId, role) {
        return this.gradingService.bulkApproveGrades(ids, userId, role);
    }
    correctGrade(dto, userId) {
        return this.gradingService.correctGrade(dto, userId);
    }
    getMissingObservations(termId, userId, role) {
        return this.gradingService.getMissingObservationsTray(termId, userId, role);
    }
    getMissingObservationsFlat(termId, userId, role) {
        return this.gradingService.getMissingObservationsTray(termId, userId, role);
    }
    getGradeEntry(id) {
        return this.prisma.gradeEntry.findUnique({
            where: { id },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, indexNumber: true, currentClass: { select: { name: true } } } },
                subject: { select: { id: true, name: true } },
                term: { select: { id: true, termNumber: true } },
            },
        });
    }
    unlockGrade(id) {
        return this.prisma.gradeEntry.update({
            where: { id },
            data: { isLocked: false, lockedById: null, lockedAt: null },
        });
    }
    getClassPerformance(classId, termId, userId, role) {
        return this.gradingService.getClassPerformanceSummary(classId, termId, userId, role);
    }
    getClassSummary(classId, termId, userId, role) {
        return this.gradingService.getClassPerformanceSummary(classId, termId, userId, role);
    }
    getStudentTermGrades(studentId, termId, role) {
        return this.gradingService.getStudentTermGrades(studentId, termId, role);
    }
    async getStudentsForGrading(subjectId, classId, termId, userId, role) {
        return this.gradingService.getStudentsForGrading(subjectId, classId, termId, userId, role);
    }
    getSmartRemarks(grade) {
        return { grade, remarks: this.gradingService.getSmartRemarks(grade) };
    }
};
exports.GradingController = GradingController;
__decorate([
    (0, common_1.Post)('entries'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Submit or update a grade entry' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [grading_dto_1.UpsertGradeDto, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "upsertGrade", null);
__decorate([
    (0, common_1.Post)('entries/bulk'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk grade entry for a class/subject' }),
    openapi.ApiResponse({ status: 201, type: [Object] }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [grading_dto_1.BulkUpsertGradeDto, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "bulkUpsert", null);
__decorate([
    (0, common_1.Patch)('entries/:id/lock'),
    (0, roles_decorator_1.Roles)(client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Lock a grade entry' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "lockGrade", null);
__decorate([
    (0, common_1.Patch)('entries/:id/approve'),
    (0, roles_decorator_1.Roles)(client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a grade entry' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "approveGrade", null);
__decorate([
    (0, common_1.Post)('entries/bulk-approve'),
    (0, roles_decorator_1.Roles)(client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk approve grade entries' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)('ids')),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "bulkApprove", null);
__decorate([
    (0, common_1.Post)('corrections'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a grade correction with audit trail' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [grading_dto_1.CorrectGradeDto, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "correctGrade", null);
__decorate([
    (0, common_1.Get)('audit-tray'),
    (0, roles_decorator_1.Roles)(client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Get missing observations tray' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('termId')),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "getMissingObservations", null);
__decorate([
    (0, common_1.Get)('missing-observations'),
    (0, roles_decorator_1.Roles)(client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Get missing observations (flat list)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('termId')),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "getMissingObservationsFlat", null);
__decorate([
    (0, common_1.Get)('entries/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single grade entry' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "getGradeEntry", null);
__decorate([
    (0, common_1.Patch)('entries/:id/unlock'),
    (0, roles_decorator_1.Roles)(client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Unlock a grade entry' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "unlockGrade", null);
__decorate([
    (0, common_1.Get)('classes/:classId/terms/:termId/performance'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get class performance summary' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Param)('termId')),
    __param(2, (0, roles_decorator_1.CurrentUser)('id')),
    __param(3, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "getClassPerformance", null);
__decorate([
    (0, common_1.Get)('class-summary/:classId'),
    (0, roles_decorator_1.Roles)(client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Get class performance summary' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Query)('termId')),
    __param(2, (0, roles_decorator_1.CurrentUser)('id')),
    __param(3, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "getClassSummary", null);
__decorate([
    (0, common_1.Get)('students/:studentId/terms/:termId'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get all grades for a student in a term' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('studentId')),
    __param(1, (0, common_1.Param)('termId')),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "getStudentTermGrades", null);
__decorate([
    (0, common_1.Get)('students/for-grading'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get students eligible for grading by subject and class' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('subjectId')),
    __param(1, (0, common_1.Query)('classId')),
    __param(2, (0, common_1.Query)('termId')),
    __param(3, (0, roles_decorator_1.CurrentUser)('id')),
    __param(4, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GradingController.prototype, "getStudentsForGrading", null);
__decorate([
    (0, common_1.Get)('smart-remarks/:grade'),
    (0, swagger_1.ApiOperation)({ summary: 'Get smart remark suggestions for a grade' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('grade')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GradingController.prototype, "getSmartRemarks", null);
exports.GradingController = GradingController = __decorate([
    (0, swagger_1.ApiTags)('Grading'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('grading'),
    __metadata("design:paramtypes", [grading_service_1.GradingService, prisma_service_1.PrismaService])
], GradingController);
//# sourceMappingURL=grading.controller.js.map
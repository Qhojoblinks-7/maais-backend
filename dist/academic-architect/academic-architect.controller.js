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
exports.AcademicArchitectController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const academic_architect_service_1 = require("./academic-architect.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const academic_architect_dto_1 = require("./dto/academic-architect.dto");
let AcademicArchitectController = class AcademicArchitectController {
    constructor(service) {
        this.service = service;
    }
    createYear(dto) {
        return this.service.createAcademicYear(dto.label, new Date(dto.startDate), new Date(dto.endDate));
    }
    activateYear(id) {
        return this.service.setActiveYear(id);
    }
    getActiveYear() {
        return this.service.getActiveYear();
    }
    getAllYears() {
        return this.service.getAllYears();
    }
    createTerm(dto) {
        return this.service.createTerm(dto.academicYearId, dto.termNumber, new Date(dto.startDate), new Date(dto.endDate));
    }
    activateTerm(id) {
        return this.service.setActiveTerm(id);
    }
    createDepartment(dto) {
        return this.service.createDepartment(dto.name, dto.code, dto.description);
    }
    getAllDepartments() {
        return this.service.getAllDepartments();
    }
    createSubject(dto) {
        return this.service.createSubject(dto);
    }
    getAllSubjects() {
        return this.service.getAllSubjects();
    }
    createClass(dto) {
        return this.service.createClassSection(dto.name, dto.level, dto.capacity, dto.program);
    }
    getAllClasses() {
        return this.service.getAllClassSections();
    }
    updateClass(id, dto) {
        return this.service.updateClassSection(id, dto);
    }
    deleteClass(id) {
        return this.service.deleteClassSection(id);
    }
    assignClassTeacher(id, dto) {
        return this.service.assignClassTeacher(id, dto.staffId);
    }
    assignTeacher(dto) {
        return this.service.assignTeacher(dto);
    }
    getTeacherAssignments(teacherId, user) {
        if (user.role === client_1.Role.TEACHER && user.staffProfile?.id !== teacherId) {
            return [];
        }
        return this.service.getTeacherAssignments(teacherId);
    }
    getAssignmentsByClass(classId) {
        return this.service.getAssignmentsByClass(classId);
    }
    getMyAssignments(user) {
        if (!user.staffProfile)
            return [];
        return this.service.getTeacherAssignments(user.staffProfile.id);
    }
};
exports.AcademicArchitectController = AcademicArchitectController;
__decorate([
    (0, common_1.Post)('years'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new academic year' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_architect_dto_1.CreateAcademicYearDto]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "createYear", null);
__decorate([
    (0, common_1.Patch)('years/:id/activate'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Set active academic year' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "activateYear", null);
__decorate([
    (0, common_1.Get)('years/active'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER, client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get current active academic year' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "getActiveYear", null);
__decorate([
    (0, common_1.Get)('years'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    (0, swagger_1.ApiOperation)({ summary: 'Get all academic years' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "getAllYears", null);
__decorate([
    (0, common_1.Post)('terms'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a term' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_architect_dto_1.CreateTermDto]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "createTerm", null);
__decorate([
    (0, common_1.Patch)('terms/:id/activate'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Set active term' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "activateTerm", null);
__decorate([
    (0, common_1.Post)('departments'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a department' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_architect_dto_1.CreateDepartmentDto]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "createDepartment", null);
__decorate([
    (0, common_1.Get)('departments'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER, client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get all departments' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "getAllDepartments", null);
__decorate([
    (0, common_1.Post)('subjects'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    (0, swagger_1.ApiOperation)({ summary: 'Create a subject' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_architect_dto_1.CreateSubjectDto]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "createSubject", null);
__decorate([
    (0, common_1.Get)('subjects'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER, client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active subjects' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "getAllSubjects", null);
__decorate([
    (0, common_1.Post)('classes'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a class section' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_architect_dto_1.CreateClassSectionDto]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "createClass", null);
__decorate([
    (0, common_1.Get)('classes'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER, client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get all class sections' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "getAllClasses", null);
__decorate([
    (0, common_1.Patch)('classes/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Update a class section' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, academic_architect_dto_1.UpdateClassSectionDto]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "updateClass", null);
__decorate([
    (0, common_1.Delete)('classes/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a class section' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "deleteClass", null);
__decorate([
    (0, common_1.Patch)('classes/:id/teacher'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Assign class teacher' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, academic_architect_dto_1.AssignClassTeacherDto]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "assignClassTeacher", null);
__decorate([
    (0, common_1.Post)('assignments'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    (0, swagger_1.ApiOperation)({ summary: 'Assign teacher to subject/class' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [academic_architect_dto_1.AssignTeacherDto]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "assignTeacher", null);
__decorate([
    (0, common_1.Get)('assignments/teacher/:teacherId'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Get teacher assignments' }),
    __param(0, (0, common_1.Param)('teacherId')),
    __param(1, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "getTeacherAssignments", null);
__decorate([
    (0, common_1.Get)('assignments/class/:classId'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Get teaching assignments for a class' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('classId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "getAssignmentsByClass", null);
__decorate([
    (0, common_1.Get)('my-assignments'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.HOD, client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get current teacher assignments' }),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AcademicArchitectController.prototype, "getMyAssignments", null);
exports.AcademicArchitectController = AcademicArchitectController = __decorate([
    (0, swagger_1.ApiTags)('Academic Architect'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('academic'),
    __metadata("design:paramtypes", [academic_architect_service_1.AcademicArchitectService])
], AcademicArchitectController);
//# sourceMappingURL=academic-architect.controller.js.map
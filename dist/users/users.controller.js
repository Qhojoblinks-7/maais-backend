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
exports.UsersController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const users_service_1 = require("./users.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const create_staff_dto_1 = require("./dto/create-staff.dto");
const create_student_dto_1 = require("./dto/create-student.dto");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    createStaff(dto) {
        return this.usersService.createStaff(dto);
    }
    createStudent(dto) {
        return this.usersService.createStudent(dto);
    }
    createParent(dto) {
        return this.usersService.createParent(dto);
    }
    getAllStudents(user) {
        return this.usersService.getAllStudents(user);
    }
    getStudentProfile(id, role, user) {
        const teacherStaffId = role === client_1.Role.TEACHER ? user?.staffProfile?.id : undefined;
        return this.usersService.getStudentProfile(id, role, teacherStaffId);
    }
    updateStudentProfile(id, body, role) {
        return this.usersService.updateStudentProfile(id, body);
    }
    getAllStaff(user) {
        return this.usersService.getAllStaff(user);
    }
    getAllParents() {
        return this.usersService.getAllParents();
    }
    deactivate(id) {
        return this.usersService.deactivateUser(id);
    }
    batchImportStudents(body) {
        return this.usersService.batchImportStudents(body.students);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)('staff'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a staff account' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_staff_dto_1.CreateStaffDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "createStaff", null);
__decorate([
    (0, common_1.Post)('students'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_student_dto_1.CreateStudentDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "createStudent", null);
__decorate([
    (0, common_1.Post)('parents'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    (0, swagger_1.ApiOperation)({ summary: 'Enrol a new parent' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "createParent", null);
__decorate([
    (0, common_1.Get)('students'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'List all active students' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getAllStudents", null);
__decorate([
    (0, common_1.Get)('students/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER, client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get full student profile' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, roles_decorator_1.CurrentUser)('role')),
    __param(2, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getStudentProfile", null);
__decorate([
    (0, common_1.Patch)('students/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update student profile (name, bio, DOB, photo)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateStudentProfile", null);
__decorate([
    (0, common_1.Get)('staff'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    (0, swagger_1.ApiOperation)({ summary: 'List all staff members' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getAllStaff", null);
__decorate([
    (0, common_1.Get)('parents'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all parent accounts' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getAllParents", null);
__decorate([
    (0, common_1.Delete)(':id/deactivate'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate a user account' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)('students/batch'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD),
    (0, swagger_1.ApiOperation)({ summary: 'Batch import students from CSSPS file' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "batchImportStudents", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map
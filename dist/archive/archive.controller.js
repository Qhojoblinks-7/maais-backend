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
exports.ArchiveController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const archive_service_1 = require("./archive.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const comms_dto_1 = require("../comms/dto/comms.dto");
let ArchiveController = class ArchiveController {
    constructor(archiveService) {
        this.archiveService = archiveService;
    }
    runPromotion(dto, userId) {
        return this.archiveService.runPromotionCycle(dto.academicYearId, userId);
    }
    searchVault(query, userId, role) {
        return this.archiveService.searchVault(query, userId, role);
    }
    lockTerm(id) {
        return this.archiveService.lockTerm(id);
    }
    health() {
        return this.archiveService.getDatabaseHealth();
    }
};
exports.ArchiveController = ArchiveController;
__decorate([
    (0, common_1.Post)('promote'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER),
    (0, swagger_1.ApiOperation)({ summary: 'Run annual promotion cycle' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [comms_dto_1.PromotionDto, String]),
    __metadata("design:returntype", void 0)
], ArchiveController.prototype, "runPromotion", null);
__decorate([
    (0, common_1.Get)('vault/search'),
    (0, roles_decorator_1.Roles)(client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Search The Vault for historical records' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, roles_decorator_1.CurrentUser)('id')),
    __param(2, (0, roles_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ArchiveController.prototype, "searchVault", null);
__decorate([
    (0, common_1.Patch)('terms/:id/lock'),
    (0, roles_decorator_1.Roles)(client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Lock a term' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArchiveController.prototype, "lockTerm", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.HEADMASTER, client_1.Role.HOD, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Database health check' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ArchiveController.prototype, "health", null);
exports.ArchiveController = ArchiveController = __decorate([
    (0, swagger_1.ApiTags)('Archive'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('archive'),
    __metadata("design:paramtypes", [archive_service_1.ArchiveService])
], ArchiveController);
//# sourceMappingURL=archive.controller.js.map
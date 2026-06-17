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
exports.ReportsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const reports_service_1 = require("./reports.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const reports_dto_1 = require("./dto/reports.dto");
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    generateOne(dto) {
        return this.reportsService.generateReportCard(dto.studentId, dto.termId);
    }
    batchGenerate(dto) {
        return this.reportsService.batchGenerateReportCards(dto.classSectionId, dto.termId);
    }
    buildTranscript(dto) {
        return this.reportsService.buildTranscript(dto.studentIdOrIndex);
    }
    verify(hash) {
        return this.reportsService.verifyDocument(hash);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Post)('report-cards/generate'),
    (0, roles_decorator_1.Roles)(client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.HOD, client_1.Role.STUDENT, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Generate report card for a single student' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.GenerateReportCardDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "generateOne", null);
__decorate([
    (0, common_1.Post)('report-cards/batch'),
    (0, roles_decorator_1.Roles)(client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Batch generate report cards for entire class' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.BatchGenerateDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "batchGenerate", null);
__decorate([
    (0, common_1.Post)('transcripts/generate'),
    (0, roles_decorator_1.Roles)(client_1.Role.HEADMASTER, client_1.Role.SUPER_ADMIN, client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Build 3-year transcript' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.BuildTranscriptDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "buildTranscript", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('verify/:hash'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify document by QR hash (public)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('hash')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "verify", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('Reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map
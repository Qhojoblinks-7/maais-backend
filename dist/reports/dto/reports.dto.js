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
exports.BuildTranscriptDto = exports.BatchGenerateDto = exports.GenerateReportCardDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class GenerateReportCardDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { studentId: { required: true, type: () => String }, termId: { required: false, type: () => String } };
    }
}
exports.GenerateReportCardDto = GenerateReportCardDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateReportCardDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateReportCardDto.prototype, "termId", void 0);
class BatchGenerateDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { classSectionId: { required: true, type: () => String }, termId: { required: true, type: () => String } };
    }
}
exports.BatchGenerateDto = BatchGenerateDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BatchGenerateDto.prototype, "classSectionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BatchGenerateDto.prototype, "termId", void 0);
class BuildTranscriptDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { studentIdOrIndex: { required: true, type: () => String } };
    }
}
exports.BuildTranscriptDto = BuildTranscriptDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'MSHTS/2024/001',
        description: 'Student ID or index number',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BuildTranscriptDto.prototype, "studentIdOrIndex", void 0);
//# sourceMappingURL=reports.dto.js.map
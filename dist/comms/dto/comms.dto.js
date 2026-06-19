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
exports.TeacherActionDto = exports.HODActionDto = exports.PromotionDto = exports.EmergencyNotificationDto = exports.SendNotificationDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class SendNotificationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { studentIds: { required: false, type: () => [String] }, title: { required: true, type: () => String }, body: { required: true, type: () => String }, channel: { required: true, type: () => Object } };
    }
}
exports.SendNotificationDto = SendNotificationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [String],
        description: 'Leave empty to notify all students',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], SendNotificationDto.prototype, "studentIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Term 2 Results Ready' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Your Term 2 report cards are now available.' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.NotificationChannel }),
    (0, class_validator_1.IsEnum)(client_1.NotificationChannel),
    __metadata("design:type", String)
], SendNotificationDto.prototype, "channel", void 0);
class EmergencyNotificationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: true, type: () => String }, message: { required: true, type: () => String } };
    }
}
exports.EmergencyNotificationDto = EmergencyNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'School Closure' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmergencyNotificationDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'School is closed tomorrow due to weather.' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmergencyNotificationDto.prototype, "message", void 0);
class PromotionDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { academicYearId: { required: true, type: () => String } };
    }
}
exports.PromotionDto = PromotionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PromotionDto.prototype, "academicYearId", void 0);
class HODActionDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { teacherId: { required: true, type: () => String }, action: { required: true, type: () => String }, details: { required: false, type: () => Object } };
    }
}
exports.HODActionDto = HODActionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'TCH-2024-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HODActionDto.prototype, "teacherId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'GRADE_SUBMITTED_TO_HOD' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HODActionDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], HODActionDto.prototype, "details", void 0);
class TeacherActionDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { recordId: { required: true, type: () => String }, action: { required: true, type: () => String }, message: { required: false, type: () => String }, className: { required: false, type: () => String } };
    }
}
exports.TeacherActionDto = TeacherActionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-of-record' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TeacherActionDto.prototype, "recordId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'GRADE_REVISION_REQUESTED' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TeacherActionDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TeacherActionDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TeacherActionDto.prototype, "className", void 0);
//# sourceMappingURL=comms.dto.js.map
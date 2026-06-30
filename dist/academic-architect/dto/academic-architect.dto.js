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
exports.UpdateClassSectionDto = exports.AssignClassTeacherDto = exports.AssignTeacherDto = exports.CreateClassSectionDto = exports.CreateSubjectDto = exports.CreateDepartmentDto = exports.CreateTermDto = exports.CreateAcademicYearDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateAcademicYearDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { label: { required: true, type: () => String }, startDate: { required: true, type: () => String }, endDate: { required: true, type: () => String } };
    }
}
exports.CreateAcademicYearDto = CreateAcademicYearDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024/2025' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAcademicYearDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-09-02' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAcademicYearDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-07-31' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAcademicYearDto.prototype, "endDate", void 0);
class CreateTermDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { academicYearId: { required: true, type: () => String }, termNumber: { required: true, type: () => Object }, startDate: { required: true, type: () => String }, endDate: { required: true, type: () => String } };
    }
}
exports.CreateTermDto = CreateTermDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTermDto.prototype, "academicYearId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.TermNumber }),
    (0, class_validator_1.IsEnum)(client_1.TermNumber),
    __metadata("design:type", String)
], CreateTermDto.prototype, "termNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-09-02' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTermDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-12-20' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTermDto.prototype, "endDate", void 0);
class CreateDepartmentDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, code: { required: true, type: () => String }, description: { required: false, type: () => String } };
    }
}
exports.CreateDepartmentDto = CreateDepartmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Science' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDepartmentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SCI' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDepartmentDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDepartmentDto.prototype, "description", void 0);
class CreateSubjectDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, code: { required: true, type: () => String }, type: { required: true, type: () => Object }, departmentId: { required: false, type: () => String }, description: { required: false, type: () => String } };
    }
}
exports.CreateSubjectDto = CreateSubjectDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Core Mathematics' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSubjectDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CMATH' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSubjectDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.SubjectType }),
    (0, class_validator_1.IsEnum)(client_1.SubjectType),
    __metadata("design:type", String)
], CreateSubjectDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSubjectDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSubjectDto.prototype, "description", void 0);
class CreateClassSectionDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, level: { required: true, type: () => Object }, capacity: { required: false, type: () => Number }, program: { required: false, type: () => String } };
    }
}
exports.CreateClassSectionDto = CreateClassSectionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1A' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClassSectionDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ClassLevel }),
    (0, class_validator_1.IsEnum)(client_1.ClassLevel),
    __metadata("design:type", String)
], CreateClassSectionDto.prototype, "level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 40 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateClassSectionDto.prototype, "capacity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Science' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClassSectionDto.prototype, "program", void 0);
class AssignTeacherDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { teacherId: { required: true, type: () => String }, subjectId: { required: true, type: () => String }, classSectionId: { required: true, type: () => String }, academicYearId: { required: true, type: () => String } };
    }
}
exports.AssignTeacherDto = AssignTeacherDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignTeacherDto.prototype, "teacherId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignTeacherDto.prototype, "subjectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignTeacherDto.prototype, "classSectionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignTeacherDto.prototype, "academicYearId", void 0);
class AssignClassTeacherDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { staffId: { required: true, type: () => String } };
    }
}
exports.AssignClassTeacherDto = AssignClassTeacherDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignClassTeacherDto.prototype, "staffId", void 0);
class UpdateClassSectionDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, level: { required: false, type: () => Object }, capacity: { required: false, type: () => Number }, program: { required: false, type: () => String } };
    }
}
exports.UpdateClassSectionDto = UpdateClassSectionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClassSectionDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ClassLevel }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ClassLevel),
    __metadata("design:type", String)
], UpdateClassSectionDto.prototype, "level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 40 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateClassSectionDto.prototype, "capacity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Science' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClassSectionDto.prototype, "program", void 0);
//# sourceMappingURL=academic-architect.dto.js.map
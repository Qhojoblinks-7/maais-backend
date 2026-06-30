import { TermNumber, ClassLevel, SubjectType } from '@prisma/client';
export declare class CreateAcademicYearDto {
    label: string;
    startDate: string;
    endDate: string;
}
export declare class CreateTermDto {
    academicYearId: string;
    termNumber: TermNumber;
    startDate: string;
    endDate: string;
}
export declare class CreateDepartmentDto {
    name: string;
    code: string;
    description?: string;
}
export declare class CreateSubjectDto {
    name: string;
    code: string;
    type: SubjectType;
    departmentId?: string;
    description?: string;
}
export declare class CreateClassSectionDto {
    name: string;
    level: ClassLevel;
    capacity?: number;
    program?: string;
    track?: string;
}
export declare class AssignTeacherDto {
    teacherId: string;
    subjectId: string;
    classSectionId: string;
    academicYearId: string;
}
export declare class AssignClassTeacherDto {
    staffId: string;
}
export declare class UpdateClassSectionDto {
    name?: string;
    level?: ClassLevel;
    capacity?: number;
    program?: string;
    track?: string;
}

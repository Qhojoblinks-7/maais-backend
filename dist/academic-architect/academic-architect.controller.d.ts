import { Role } from '@prisma/client';
import { AcademicArchitectService } from './academic-architect.service';
import { CreateAcademicYearDto, CreateTermDto, CreateDepartmentDto, CreateSubjectDto, CreateClassSectionDto, AssignTeacherDto, AssignClassTeacherDto } from './dto/academic-architect.dto';
export declare class AcademicArchitectController {
    private service;
    constructor(service: AcademicArchitectService);
    createYear(dto: CreateAcademicYearDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        label: string;
        startDate: Date;
        endDate: Date;
    }>;
    activateYear(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        label: string;
        startDate: Date;
        endDate: Date;
    }>;
    getActiveYear(): Promise<{
        terms: {
            id: string;
            isActive: boolean;
            academicYearId: string;
            isLocked: boolean;
            startDate: Date;
            endDate: Date;
            termNumber: import(".prisma/client").$Enums.TermNumber;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        label: string;
        startDate: Date;
        endDate: Date;
    }>;
    getAllYears(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        label: string;
        startDate: Date;
        endDate: Date;
    }[]>;
    createTerm(dto: CreateTermDto): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        isLocked: boolean;
        startDate: Date;
        endDate: Date;
        termNumber: import(".prisma/client").$Enums.TermNumber;
    }>;
    activateTerm(id: string): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        isLocked: boolean;
        startDate: Date;
        endDate: Date;
        termNumber: import(".prisma/client").$Enums.TermNumber;
    }>;
    createDepartment(dto: CreateDepartmentDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        code: string;
        isFrozen: boolean;
        freezeReason: string | null;
        frozenAt: Date | null;
    }>;
    getAllDepartments(): Promise<({
        _count: {
            staff: number;
            subjects: number;
        };
        staff: ({
            user: {
                id: string;
                email: string;
                role: import(".prisma/client").$Enums.Role;
                isActive: boolean;
            };
        } & {
            id: string;
            phone: string | null;
            userId: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            departmentId: string | null;
            staffId: string;
            hiredAt: Date;
        })[];
        subjects: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            departmentId: string | null;
            type: import(".prisma/client").$Enums.SubjectType;
            description: string | null;
            code: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        code: string;
        isFrozen: boolean;
        freezeReason: string | null;
        frozenAt: Date | null;
    })[]>;
    createSubject(dto: CreateSubjectDto): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        departmentId: string | null;
        type: import(".prisma/client").$Enums.SubjectType;
        description: string | null;
        code: string;
    }>;
    getAllSubjects(): Promise<({
        department: {
            name: string;
            id: string;
            createdAt: Date;
            description: string | null;
            code: string;
            isFrozen: boolean;
            freezeReason: string | null;
            frozenAt: Date | null;
        };
    } & {
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        departmentId: string | null;
        type: import(".prisma/client").$Enums.SubjectType;
        description: string | null;
        code: string;
    })[]>;
    createClass(dto: CreateClassSectionDto): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    getAllClasses(): Promise<({
        _count: {
            students: number;
        };
        classTeacher: {
            id: string;
            phone: string | null;
            userId: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            departmentId: string | null;
            staffId: string;
            hiredAt: Date;
        };
    } & {
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
        capacity: number;
        classTeacherId: string | null;
    })[]>;
    assignClassTeacher(id: string, dto: AssignClassTeacherDto): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    assignTeacher(dto: AssignTeacherDto): Promise<{
        id: string;
        teacherId: string;
        subjectId: string;
        classSectionId: string;
        academicYearId: string;
    }>;
    getTeacherAssignments(teacherId: string, user: {
        role: Role;
        staffProfile?: {
            id: string;
        };
    }): any[] | Promise<({
        subject: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            departmentId: string | null;
            type: import(".prisma/client").$Enums.SubjectType;
            description: string | null;
            code: string;
        };
        classSection: {
            level: import(".prisma/client").$Enums.ClassLevel;
            name: string;
            id: string;
            capacity: number;
            classTeacherId: string | null;
        };
    } & {
        id: string;
        teacherId: string;
        subjectId: string;
        classSectionId: string;
        academicYearId: string;
    })[]>;
    getMyAssignments(user: any): any[] | Promise<({
        subject: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            departmentId: string | null;
            type: import(".prisma/client").$Enums.SubjectType;
            description: string | null;
            code: string;
        };
        classSection: {
            level: import(".prisma/client").$Enums.ClassLevel;
            name: string;
            id: string;
            capacity: number;
            classTeacherId: string | null;
        };
    } & {
        id: string;
        teacherId: string;
        subjectId: string;
        classSectionId: string;
        academicYearId: string;
    })[]>;
}

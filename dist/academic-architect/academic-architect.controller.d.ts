import { AcademicArchitectService } from './academic-architect.service';
import { CreateAcademicYearDto, CreateTermDto, CreateDepartmentDto, CreateSubjectDto, CreateClassSectionDto, AssignTeacherDto, AssignClassTeacherDto } from './dto/academic-architect.dto';
export declare class AcademicArchitectController {
    private service;
    constructor(service: AcademicArchitectService);
    createYear(dto: CreateAcademicYearDto): Promise<{
        id: string;
        createdAt: Date;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        label: string;
    }>;
    activateYear(id: string): Promise<{
        id: string;
        createdAt: Date;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        label: string;
    }>;
    getActiveYear(): Promise<{
        terms: {
            id: string;
            isActive: boolean;
            academicYearId: string;
            termNumber: import(".prisma/client").$Enums.TermNumber;
            startDate: Date;
            endDate: Date;
            isLocked: boolean;
        }[];
    } & {
        id: string;
        createdAt: Date;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        label: string;
    }>;
    createTerm(dto: CreateTermDto): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        termNumber: import(".prisma/client").$Enums.TermNumber;
        startDate: Date;
        endDate: Date;
        isLocked: boolean;
    }>;
    activateTerm(id: string): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        termNumber: import(".prisma/client").$Enums.TermNumber;
        startDate: Date;
        endDate: Date;
        isLocked: boolean;
    }>;
    createDepartment(dto: CreateDepartmentDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        code: string;
        description: string | null;
    }>;
    getAllDepartments(): Promise<({
        _count: {
            staff: number;
        };
        subjects: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            name: string;
            code: string;
            type: import(".prisma/client").$Enums.SubjectType;
            departmentId: string | null;
            description: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        code: string;
        description: string | null;
    })[]>;
    createSubject(dto: CreateSubjectDto): Promise<{
        id: string;
        createdAt: Date;
        isActive: boolean;
        name: string;
        code: string;
        type: import(".prisma/client").$Enums.SubjectType;
        departmentId: string | null;
        description: string | null;
    }>;
    getAllSubjects(): Promise<({
        department: {
            id: string;
            createdAt: Date;
            name: string;
            code: string;
            description: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        isActive: boolean;
        name: string;
        code: string;
        type: import(".prisma/client").$Enums.SubjectType;
        departmentId: string | null;
        description: string | null;
    })[]>;
    createClass(dto: CreateClassSectionDto): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        id: string;
        name: string;
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
            departmentId: string | null;
            userId: string;
            staffId: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            hiredAt: Date;
        };
    } & {
        level: import(".prisma/client").$Enums.ClassLevel;
        id: string;
        name: string;
        capacity: number;
        classTeacherId: string | null;
    })[]>;
    assignClassTeacher(id: string, dto: AssignClassTeacherDto): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        id: string;
        name: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    assignTeacher(dto: AssignTeacherDto): Promise<{
        id: string;
        subjectId: string;
        teacherId: string;
        academicYearId: string;
        classSectionId: string;
    }>;
    getTeacherAssignments(teacherId: string): Promise<({
        classSection: {
            level: import(".prisma/client").$Enums.ClassLevel;
            id: string;
            name: string;
            capacity: number;
            classTeacherId: string | null;
        };
        subject: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            name: string;
            code: string;
            type: import(".prisma/client").$Enums.SubjectType;
            departmentId: string | null;
            description: string | null;
        };
    } & {
        id: string;
        subjectId: string;
        teacherId: string;
        academicYearId: string;
        classSectionId: string;
    })[]>;
    getMyAssignments(user: any): any[] | Promise<({
        classSection: {
            level: import(".prisma/client").$Enums.ClassLevel;
            id: string;
            name: string;
            capacity: number;
            classTeacherId: string | null;
        };
        subject: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            name: string;
            code: string;
            type: import(".prisma/client").$Enums.SubjectType;
            departmentId: string | null;
            description: string | null;
        };
    } & {
        id: string;
        subjectId: string;
        teacherId: string;
        academicYearId: string;
        classSectionId: string;
    })[]>;
}

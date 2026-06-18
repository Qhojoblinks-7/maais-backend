import { PrismaService } from '../common/prisma/prisma.service';
import { TermNumber, ClassLevel, SubjectType } from '@prisma/client';
export declare class AcademicArchitectService {
    private prisma;
    constructor(prisma: PrismaService);
    createAcademicYear(label: string, startDate: Date, endDate: Date): Promise<{
        id: string;
        createdAt: Date;
        isActive: boolean;
        startDate: Date;
        endDate: Date;
        label: string;
    }>;
    setActiveYear(yearId: string): Promise<{
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
    createTerm(academicYearId: string, termNumber: TermNumber, startDate: Date, endDate: Date): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        termNumber: import(".prisma/client").$Enums.TermNumber;
        startDate: Date;
        endDate: Date;
        isLocked: boolean;
    }>;
    setActiveTerm(termId: string): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        termNumber: import(".prisma/client").$Enums.TermNumber;
        startDate: Date;
        endDate: Date;
        isLocked: boolean;
    }>;
    createDepartment(name: string, code: string, description?: string): Promise<{
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
    createSubject(dto: {
        name: string;
        code: string;
        type: SubjectType;
        departmentId?: string;
        description?: string;
    }): Promise<{
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
    createClassSection(name: string, level: ClassLevel, capacity?: number): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        id: string;
        name: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    getAllClassSections(): Promise<({
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
    assignClassTeacher(classSectionId: string, staffId: string): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        id: string;
        name: string;
        capacity: number;
        classTeacherId: string | null;
    }>;
    assignTeacher(dto: {
        teacherId: string;
        subjectId: string;
        classSectionId: string;
        academicYearId: string;
    }): Promise<{
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
}

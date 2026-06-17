import { PrismaService } from '../common/prisma/prisma.service';
import { TermNumber, ClassLevel, SubjectType } from '@prisma/client';
export declare class AcademicArchitectService {
    private prisma;
    constructor(prisma: PrismaService);
    createAcademicYear(label: string, startDate: Date, endDate: Date): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        label: string;
        startDate: Date;
        endDate: Date;
    }>;
    setActiveYear(yearId: string): Promise<{
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
            isLocked: boolean;
            startDate: Date;
            endDate: Date;
            termNumber: import(".prisma/client").$Enums.TermNumber;
            academicYearId: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        label: string;
        startDate: Date;
        endDate: Date;
    }>;
    createTerm(academicYearId: string, termNumber: TermNumber, startDate: Date, endDate: Date): Promise<{
        id: string;
        isActive: boolean;
        isLocked: boolean;
        startDate: Date;
        endDate: Date;
        termNumber: import(".prisma/client").$Enums.TermNumber;
        academicYearId: string;
    }>;
    setActiveTerm(termId: string): Promise<{
        id: string;
        isActive: boolean;
        isLocked: boolean;
        startDate: Date;
        endDate: Date;
        termNumber: import(".prisma/client").$Enums.TermNumber;
        academicYearId: string;
    }>;
    createDepartment(name: string, code: string, description?: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        code: string;
    }>;
    getAllDepartments(): Promise<({
        _count: {
            staff: number;
        };
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
    })[]>;
    createSubject(dto: {
        name: string;
        code: string;
        type: SubjectType;
        departmentId?: string;
        description?: string;
    }): Promise<{
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
    createClassSection(name: string, level: ClassLevel, capacity?: number): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
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
    assignClassTeacher(classSectionId: string, staffId: string): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
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
        academicYearId: string;
        teacherId: string;
        classSectionId: string;
    }>;
    getTeacherAssignments(teacherId: string): Promise<({
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
        subjectId: string;
        academicYearId: string;
        teacherId: string;
        classSectionId: string;
    })[]>;
}

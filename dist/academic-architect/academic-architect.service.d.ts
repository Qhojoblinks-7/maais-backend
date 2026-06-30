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
    createTerm(academicYearId: string, termNumber: TermNumber, startDate: Date, endDate: Date): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        isLocked: boolean;
        startDate: Date;
        endDate: Date;
        termNumber: import(".prisma/client").$Enums.TermNumber;
    }>;
    setActiveTerm(termId: string): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        isLocked: boolean;
        startDate: Date;
        endDate: Date;
        termNumber: import(".prisma/client").$Enums.TermNumber;
    }>;
    createDepartment(name: string, code: string, description?: string): Promise<{
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
            canTeach: boolean;
            canOversight: boolean;
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
            creditHours: number;
            applicablePrograms: string[];
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
        creditHours: number;
        applicablePrograms: string[];
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
        creditHours: number;
        applicablePrograms: string[];
    })[]>;
    createClassSection(name: string, level: ClassLevel, capacity?: number, program?: string, track?: string): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
        capacity: number;
        program: string | null;
        classTeacherId: string | null;
        track: string | null;
    }>;
    getAllClassSections(track?: string): Promise<({
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
            canTeach: boolean;
            canOversight: boolean;
        };
    } & {
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
        capacity: number;
        program: string | null;
        classTeacherId: string | null;
        track: string | null;
    })[]>;
    assignClassTeacher(classSectionId: string, staffId: string): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
        capacity: number;
        program: string | null;
        classTeacherId: string | null;
        track: string | null;
    }>;
    updateClassSection(classSectionId: string, data: {
        name?: string;
        level?: ClassLevel;
        capacity?: number;
        program?: string;
    }): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
        capacity: number;
        program: string | null;
        classTeacherId: string | null;
        track: string | null;
    }>;
    deleteClassSection(classSectionId: string): Promise<{
        level: import(".prisma/client").$Enums.ClassLevel;
        name: string;
        id: string;
        capacity: number;
        program: string | null;
        classTeacherId: string | null;
        track: string | null;
    }>;
    assignTeacher(dto: {
        teacherId: string;
        subjectId: string;
        classSectionId: string;
        academicYearId: string;
    }): Promise<{
        id: string;
        teacherId: string;
        subjectId: string;
        classSectionId: string;
        academicYearId: string;
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
            creditHours: number;
            applicablePrograms: string[];
        };
        classSection: {
            level: import(".prisma/client").$Enums.ClassLevel;
            name: string;
            id: string;
            capacity: number;
            program: string | null;
            classTeacherId: string | null;
            track: string | null;
        };
    } & {
        id: string;
        teacherId: string;
        subjectId: string;
        classSectionId: string;
        academicYearId: string;
    })[]>;
    getAssignmentsByClass(classSectionId: string, track?: string): Promise<({
        subject: {
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
            creditHours: number;
            applicablePrograms: string[];
        };
        classSection: {
            level: import(".prisma/client").$Enums.ClassLevel;
            name: string;
            id: string;
            capacity: number;
            program: string | null;
            classTeacherId: string | null;
            track: string | null;
        };
        teacher: {
            user: {
                email: string;
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
            canTeach: boolean;
            canOversight: boolean;
        };
    } & {
        id: string;
        teacherId: string;
        subjectId: string;
        classSectionId: string;
        academicYearId: string;
    })[]>;
}

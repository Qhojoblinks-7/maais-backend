import { PrismaService } from '../common/prisma/prisma.service';
import { Role, Gender } from '@prisma/client';
export interface CreateStaffDto {
    email: string;
    password: string;
    role: Role;
    staffId: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    gender: Gender;
    phone?: string;
    departmentId?: string;
}
export interface CreateStudentDto {
    email?: string;
    password: string;
    indexNumber: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    gender: Gender;
    dateOfBirth?: string;
    currentClassId?: string;
    departmentId?: string;
    parentFirstName?: string;
    parentLastName?: string;
    parentPhone?: string;
    parentEmail?: string;
    parentRelationship?: string;
}
export interface CreateParentDto {
    email?: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone: string;
    occupation?: string;
}
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    createStaff(dto: CreateStaffDto): Promise<{
        staffProfile: {
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
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createStudent(dto: CreateStudentDto): Promise<{
        studentProfile: {
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
            currentClass: {
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
            userId: string;
            indexNumber: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            admissionDate: Date;
            currentClassId: string | null;
            departmentId: string | null;
            archivedAt: Date | null;
        };
    } & {
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createParent(dto: CreateParentDto): Promise<{
        parentProfile: {
            id: string;
            email: string | null;
            phone: string;
            userId: string;
            firstName: string;
            lastName: string;
            occupation: string | null;
        };
    } & {
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAllStudents(user?: {
        id: string;
        role: Role;
    }, search?: string): Promise<({
        user: {
            email: string;
            phone: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            lastLoginAt: Date;
        };
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
        currentClass: {
            level: import(".prisma/client").$Enums.ClassLevel;
            name: string;
            id: string;
            capacity: number;
            program: string | null;
            classTeacherId: string | null;
            track: string | null;
        };
        grades: ({
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            subjectId: string;
            termId: string;
            classScore: number | null;
            examScore: number | null;
            totalScore: number | null;
            grade: string | null;
            remark: string | null;
            position: number | null;
            hasObservation: boolean;
            observationText: string | null;
            isLocked: boolean;
            lockedById: string | null;
            lockedAt: Date | null;
            submittedById: string | null;
            submittedAt: Date | null;
            isApproved: boolean;
            approvedById: string | null;
            approvedAt: Date | null;
        })[];
        parentLinks: ({
            parent: {
                id: string;
                email: string | null;
                phone: string;
                userId: string;
                firstName: string;
                lastName: string;
                occupation: string | null;
            };
        } & {
            id: string;
            studentId: string;
            parentId: string;
            relationship: string;
            isPrimary: boolean;
        })[];
    } & {
        id: string;
        userId: string;
        indexNumber: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        admissionDate: Date;
        currentClassId: string | null;
        departmentId: string | null;
        archivedAt: Date | null;
    })[]>;
    getStudentProfile(studentId: string, requesterRole?: Role, teacherStaffId?: string): Promise<{
        user: {
            email: string;
            lastLoginAt: Date;
        };
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
        currentClass: {
            level: import(".prisma/client").$Enums.ClassLevel;
            name: string;
            id: string;
            capacity: number;
            program: string | null;
            classTeacherId: string | null;
            track: string | null;
        };
        grades: ({
            term: {
                academicYear: {
                    id: string;
                    isActive: boolean;
                    createdAt: Date;
                    label: string;
                    startDate: Date;
                    endDate: Date;
                };
            } & {
                id: string;
                isActive: boolean;
                academicYearId: string;
                isLocked: boolean;
                startDate: Date;
                endDate: Date;
                termNumber: import(".prisma/client").$Enums.TermNumber;
            };
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            subjectId: string;
            termId: string;
            classScore: number | null;
            examScore: number | null;
            totalScore: number | null;
            grade: string | null;
            remark: string | null;
            position: number | null;
            hasObservation: boolean;
            observationText: string | null;
            isLocked: boolean;
            lockedById: string | null;
            lockedAt: Date | null;
            submittedById: string | null;
            submittedAt: Date | null;
            isApproved: boolean;
            approvedById: string | null;
            approvedAt: Date | null;
        })[];
        reportCards: ({
            term: {
                academicYear: {
                    id: string;
                    isActive: boolean;
                    createdAt: Date;
                    label: string;
                    startDate: Date;
                    endDate: Date;
                };
            } & {
                id: string;
                isActive: boolean;
                academicYearId: string;
                isLocked: boolean;
                startDate: Date;
                endDate: Date;
                termNumber: import(".prisma/client").$Enums.TermNumber;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            termId: string;
            totalScore: number | null;
            documentType: import(".prisma/client").$Enums.DocumentType;
            systemHash: string;
            qrCodeUrl: string | null;
            verificationUrl: string | null;
            averageScore: number | null;
            classPosition: number | null;
            classSize: number | null;
            conductGrade: string | null;
            headmasterRemarks: string | null;
            classTeacherRemarks: string | null;
            pdfUrl: string | null;
            generatedAt: Date | null;
            releasedAt: Date | null;
        })[];
        parentLinks: ({
            parent: {
                id: string;
                email: string | null;
                phone: string;
                userId: string;
                firstName: string;
                lastName: string;
                occupation: string | null;
            };
        } & {
            id: string;
            studentId: string;
            parentId: string;
            relationship: string;
            isPrimary: boolean;
        })[];
    } & {
        id: string;
        userId: string;
        indexNumber: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        admissionDate: Date;
        currentClassId: string | null;
        departmentId: string | null;
        archivedAt: Date | null;
    }>;
    getAllStaff(user?: {
        id: string;
        role: Role;
    }): Promise<({
        user: {
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
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
        teachingAssignments: ({
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
        })[];
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
    })[]>;
    searchTeachers(user?: {
        id: string;
        role: Role;
    }, search?: string): Promise<({
        user: {
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
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
        teachingAssignments: ({
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
        })[];
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
    })[]>;
    deactivateUser(userId: string): Promise<{
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateStudentProfile(studentId: string, dto: {
        firstName?: string;
        lastName?: string;
        middleName?: string;
        photoUrl?: string;
        dateOfBirth?: string;
    }): Promise<{
        user: {
            email: string;
            lastLoginAt: Date;
        };
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
        currentClass: {
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
        userId: string;
        indexNumber: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        admissionDate: Date;
        currentClassId: string | null;
        departmentId: string | null;
        archivedAt: Date | null;
    }>;
    getAllParents(): Promise<any>;
    searchParents(user?: {
        id: string;
        role: Role;
    }, search?: string): Promise<{
        user: {
            email: string;
            isActive: boolean;
        };
        id: string;
        email: string;
        phone: string;
        firstName: string;
        lastName: string;
    }[]>;
    getStaffProfile(staffId: string, requester: {
        id: string;
        role: Role;
    }): Promise<{
        user: {
            email: string;
            phone: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            lastLoginAt: Date;
        };
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
        teachingAssignments: ({
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
        })[];
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
    }>;
    batchImportStudents(students: any[]): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
}

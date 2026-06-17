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
            staffId: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            hiredAt: Date;
            departmentId: string | null;
            userId: string;
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
                id: string;
                createdAt: Date;
                name: string;
                code: string;
                description: string | null;
            };
            currentClass: {
                level: import(".prisma/client").$Enums.ClassLevel;
                id: string;
                name: string;
                capacity: number;
                classTeacherId: string | null;
            };
        } & {
            id: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            departmentId: string | null;
            userId: string;
            indexNumber: string;
            bio: string | null;
            admissionDate: Date;
            archivedAt: Date | null;
            currentClassId: string | null;
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
            firstName: string;
            lastName: string;
            userId: string;
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
    }): Promise<({
        department: {
            id: string;
            createdAt: Date;
            name: string;
            code: string;
            description: string | null;
        };
        user: {
            email: string;
            isActive: boolean;
        };
        currentClass: {
            level: import(".prisma/client").$Enums.ClassLevel;
            id: string;
            name: string;
            capacity: number;
            classTeacherId: string | null;
        };
    } & {
        id: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        departmentId: string | null;
        userId: string;
        indexNumber: string;
        bio: string | null;
        admissionDate: Date;
        archivedAt: Date | null;
        currentClassId: string | null;
    })[]>;
    getStudentProfile(studentId: string, requesterRole?: Role, teacherStaffId?: string): Promise<{
        department: {
            id: string;
            createdAt: Date;
            name: string;
            code: string;
            description: string | null;
        };
        user: {
            email: string;
            lastLoginAt: Date;
        };
        currentClass: {
            level: import(".prisma/client").$Enums.ClassLevel;
            id: string;
            name: string;
            capacity: number;
            classTeacherId: string | null;
        };
        grades: ({
            subject: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                departmentId: string | null;
                name: string;
                code: string;
                description: string | null;
                type: import(".prisma/client").$Enums.SubjectType;
            };
            term: {
                academicYear: {
                    id: string;
                    isActive: boolean;
                    createdAt: Date;
                    startDate: Date;
                    endDate: Date;
                    label: string;
                };
            } & {
                id: string;
                isActive: boolean;
                academicYearId: string;
                isLocked: boolean;
                termNumber: import(".prisma/client").$Enums.TermNumber;
                startDate: Date;
                endDate: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            subjectId: string;
            isApproved: boolean;
            studentId: string;
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
            approvedById: string | null;
            approvedAt: Date | null;
        })[];
        reportCards: ({
            term: {
                academicYear: {
                    id: string;
                    isActive: boolean;
                    createdAt: Date;
                    startDate: Date;
                    endDate: Date;
                    label: string;
                };
            } & {
                id: string;
                isActive: boolean;
                academicYearId: string;
                isLocked: boolean;
                termNumber: import(".prisma/client").$Enums.TermNumber;
                startDate: Date;
                endDate: Date;
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
                firstName: string;
                lastName: string;
                userId: string;
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
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        departmentId: string | null;
        userId: string;
        indexNumber: string;
        bio: string | null;
        admissionDate: Date;
        archivedAt: Date | null;
        currentClassId: string | null;
    }>;
    getAllStaff(user?: {
        id: string;
        role: Role;
    }): Promise<({
        department: {
            id: string;
            createdAt: Date;
            name: string;
            code: string;
            description: string | null;
        };
        teachingAssignments: ({
            classSection: {
                level: import(".prisma/client").$Enums.ClassLevel;
                id: string;
                name: string;
                capacity: number;
                classTeacherId: string | null;
            };
            subject: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                departmentId: string | null;
                name: string;
                code: string;
                description: string | null;
                type: import(".prisma/client").$Enums.SubjectType;
            };
        } & {
            id: string;
            teacherId: string;
            subjectId: string;
            classSectionId: string;
            academicYearId: string;
        })[];
        user: {
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
    } & {
        id: string;
        phone: string | null;
        staffId: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        hiredAt: Date;
        departmentId: string | null;
        userId: string;
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
        bio?: string;
        photoUrl?: string;
        dateOfBirth?: string;
    }): Promise<{
        department: {
            id: string;
            createdAt: Date;
            name: string;
            code: string;
            description: string | null;
        };
        user: {
            email: string;
            lastLoginAt: Date;
        };
        currentClass: {
            level: import(".prisma/client").$Enums.ClassLevel;
            id: string;
            name: string;
            capacity: number;
            classTeacherId: string | null;
        };
    } & {
        id: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        departmentId: string | null;
        userId: string;
        indexNumber: string;
        bio: string | null;
        admissionDate: Date;
        archivedAt: Date | null;
        currentClassId: string | null;
    }>;
}

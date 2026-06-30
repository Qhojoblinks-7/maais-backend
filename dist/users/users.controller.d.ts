import { Role } from '@prisma/client';
import { UsersService, CreateParentDto } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateStudentDto } from './dto/create-student.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
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
    getAllStudents(user: {
        id: string;
        role: Role;
    }): Promise<({
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
    getStudentProfile(id: string, role: Role, user: {
        id: string;
        role: Role;
        staffProfile?: {
            id: string;
        };
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
        };
        grades: ({
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
    updateStudentProfile(id: string, body: any, role: Role): Promise<{
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
    getAllStaff(user: {
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
    getAllParents(): Promise<any>;
    deactivate(id: string): Promise<{
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
    batchImportStudents(body: {
        students: any[];
    }): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
}

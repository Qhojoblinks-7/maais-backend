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
        id: string;
        createdAt: Date;
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
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
            departmentId: string | null;
            userId: string;
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            indexNumber: string;
            bio: string | null;
            admissionDate: Date;
            currentClassId: string | null;
            archivedAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
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
        createdAt: Date;
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
        updatedAt: Date;
    }>;
    getAllStudents(user: {
        id: string;
        role: Role;
    }): Promise<({
        user: {
            email: string;
            isActive: boolean;
        };
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
        departmentId: string | null;
        userId: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        indexNumber: string;
        bio: string | null;
        admissionDate: Date;
        currentClassId: string | null;
        archivedAt: Date | null;
    })[]>;
    getStudentProfile(id: string, role: Role, user: {
        id: string;
        staffProfile?: {
            id: string;
        };
    }): Promise<{
        user: {
            email: string;
            lastLoginAt: Date;
        };
        department: {
            id: string;
            createdAt: Date;
            name: string;
            code: string;
            description: string | null;
        };
        grades: ({
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
            term: {
                academicYear: {
                    id: string;
                    createdAt: Date;
                    isActive: boolean;
                    startDate: Date;
                    endDate: Date;
                    label: string;
                };
            } & {
                id: string;
                isActive: boolean;
                academicYearId: string;
                termNumber: import(".prisma/client").$Enums.TermNumber;
                startDate: Date;
                endDate: Date;
                isLocked: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            subjectId: string;
            updatedAt: Date;
            studentId: string;
            termId: string;
            totalScore: number | null;
            isLocked: boolean;
            classScore: number | null;
            examScore: number | null;
            grade: string | null;
            remark: string | null;
            position: number | null;
            hasObservation: boolean;
            observationText: string | null;
            lockedById: string | null;
            lockedAt: Date | null;
            submittedById: string | null;
            submittedAt: Date | null;
            isApproved: boolean;
            approvedById: string | null;
            approvedAt: Date | null;
        })[];
        currentClass: {
            level: import(".prisma/client").$Enums.ClassLevel;
            id: string;
            name: string;
            capacity: number;
            classTeacherId: string | null;
        };
        reportCards: ({
            term: {
                academicYear: {
                    id: string;
                    createdAt: Date;
                    isActive: boolean;
                    startDate: Date;
                    endDate: Date;
                    label: string;
                };
            } & {
                id: string;
                isActive: boolean;
                academicYearId: string;
                termNumber: import(".prisma/client").$Enums.TermNumber;
                startDate: Date;
                endDate: Date;
                isLocked: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            termId: string;
            documentType: import(".prisma/client").$Enums.DocumentType;
            systemHash: string;
            qrCodeUrl: string | null;
            verificationUrl: string | null;
            totalScore: number | null;
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
        departmentId: string | null;
        userId: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        indexNumber: string;
        bio: string | null;
        admissionDate: Date;
        currentClassId: string | null;
        archivedAt: Date | null;
    }>;
    updateStudentProfile(id: string, body: any, role: Role): Promise<{
        user: {
            email: string;
            lastLoginAt: Date;
        };
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
        departmentId: string | null;
        userId: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        indexNumber: string;
        bio: string | null;
        admissionDate: Date;
        currentClassId: string | null;
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
        })[];
        department: {
            id: string;
            createdAt: Date;
            name: string;
            code: string;
            description: string | null;
        };
    } & {
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
    })[]>;
    deactivate(id: string): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        phone: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        lastLoginAt: Date | null;
        updatedAt: Date;
    }>;
}

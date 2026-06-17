import { PrismaService } from '../common/prisma/prisma.service';
import { ClassLevel, Role } from '@prisma/client';
export declare class ArchiveService {
    private prisma;
    constructor(prisma: PrismaService);
    runPromotionCycle(academicYearId: string, performedById: string): Promise<{
        academicYear: string;
        totalProcessed: number;
        promoted: number;
        graduated: number;
    }>;
    searchVault(query: {
        indexNumber?: string;
        firstName?: string;
        lastName?: string;
        academicYearId?: string;
        classLevel?: ClassLevel;
    }, userId?: string, userRole?: Role): Promise<({
        promotions: ({
            academicYear: {
                id: string;
                label: string;
                startDate: Date;
                endDate: Date;
                isActive: boolean;
                createdAt: Date;
            };
        } & {
            id: string;
            studentId: string;
            academicYearId: string;
            fromClass: import(".prisma/client").$Enums.ClassLevel;
            toClass: import(".prisma/client").$Enums.ClassLevel | null;
            status: import(".prisma/client").$Enums.PromotionStatus;
            notes: string | null;
            performedById: string;
            performedAt: Date;
        })[];
        grades: ({
            subject: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                name: string;
                departmentId: string | null;
                code: string;
                type: import(".prisma/client").$Enums.SubjectType;
                description: string | null;
            };
            term: {
                academicYear: {
                    id: string;
                    label: string;
                    startDate: Date;
                    endDate: Date;
                    isActive: boolean;
                    createdAt: Date;
                };
            } & {
                id: string;
                startDate: Date;
                endDate: Date;
                isActive: boolean;
                academicYearId: string;
                isLocked: boolean;
                termNumber: import(".prisma/client").$Enums.TermNumber;
            };
        } & {
            id: string;
            createdAt: Date;
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
            updatedAt: Date;
        })[];
        reportCards: ({
            term: {
                academicYear: {
                    id: string;
                    label: string;
                    startDate: Date;
                    endDate: Date;
                    isActive: boolean;
                    createdAt: Date;
                };
            } & {
                id: string;
                startDate: Date;
                endDate: Date;
                isActive: boolean;
                academicYearId: string;
                isLocked: boolean;
                termNumber: import(".prisma/client").$Enums.TermNumber;
            };
        } & {
            id: string;
            createdAt: Date;
            studentId: string;
            termId: string;
            totalScore: number | null;
            updatedAt: Date;
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
    } & {
        id: string;
        userId: string;
        indexNumber: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
        bio: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        dateOfBirth: Date | null;
        photoUrl: string | null;
        admissionDate: Date;
        currentClassId: string | null;
        departmentId: string | null;
        archivedAt: Date | null;
    })[]>;
    lockTerm(termId: string): Promise<{
        id: string;
        startDate: Date;
        endDate: Date;
        isActive: boolean;
        academicYearId: string;
        isLocked: boolean;
        termNumber: import(".prisma/client").$Enums.TermNumber;
    }>;
    getDatabaseHealth(): Promise<{
        status: string;
        checkedAt: Date;
        counts: {
            totalStudents: number;
            activeStudents: number;
            archivedStudents: number;
            totalGrades: number;
            totalReportCards: number;
            totalTranscripts: number;
            pendingObservations: number;
        };
    }>;
}

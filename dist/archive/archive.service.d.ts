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
        promotions: ({
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
            studentId: string;
            status: import(".prisma/client").$Enums.PromotionStatus;
            notes: string | null;
            academicYearId: string;
            fromClass: import(".prisma/client").$Enums.ClassLevel;
            toClass: import(".prisma/client").$Enums.ClassLevel | null;
            performedById: string;
            performedAt: Date;
        })[];
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
    lockTerm(termId: string): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        termNumber: import(".prisma/client").$Enums.TermNumber;
        startDate: Date;
        endDate: Date;
        isLocked: boolean;
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

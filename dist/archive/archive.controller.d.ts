import { Role } from '@prisma/client';
import { ArchiveService } from './archive.service';
import { PromotionDto } from '../comms/dto/comms.dto';
export declare class ArchiveController {
    private archiveService;
    constructor(archiveService: ArchiveService);
    runPromotion(dto: PromotionDto, userId: string): Promise<{
        academicYear: string;
        totalProcessed: number;
        promoted: number;
        graduated: number;
    }>;
    searchVault(query: any, userId: string, role: Role): Promise<({
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
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            subjectId: string;
            isApproved: boolean;
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
        promotions: ({
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
            studentId: string;
            academicYearId: string;
            status: import(".prisma/client").$Enums.PromotionStatus;
            notes: string | null;
            fromClass: import(".prisma/client").$Enums.ClassLevel;
            toClass: import(".prisma/client").$Enums.ClassLevel | null;
            performedById: string;
            performedAt: Date;
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
    lockTerm(id: string): Promise<{
        id: string;
        isActive: boolean;
        academicYearId: string;
        isLocked: boolean;
        startDate: Date;
        endDate: Date;
        termNumber: import(".prisma/client").$Enums.TermNumber;
    }>;
    health(): Promise<{
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

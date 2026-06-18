import { ReportsService } from './reports.service';
import { GenerateReportCardDto, BatchGenerateDto, BuildTranscriptDto } from './dto/reports.dto';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    generateOne(dto: GenerateReportCardDto): Promise<{
        reportCard: {
            student: {
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
        attendance: {
            id: string;
            studentId: string;
            termId: string;
            daysPresent: number;
            totalDays: number;
            daysAbsent: number;
        };
        student: {
            user: {
                id: string;
                createdAt: Date;
                email: string;
                phone: string | null;
                passwordHash: string;
                role: import(".prisma/client").$Enums.Role;
                isActive: boolean;
                lastLoginAt: Date | null;
                updatedAt: Date;
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
        statistics: {
            totalScore: number;
            averageScore: number;
            subjectCount: number;
        };
    }>;
    batchGenerate(dto: BatchGenerateDto): Promise<{
        total: number;
        succeeded: number;
        failedCount: number;
        failed: {
            studentId: string;
            indexNumber: string;
            error: any;
        }[];
    }>;
    buildTranscript(dto: BuildTranscriptDto): Promise<{
        transcript: {
            id: string;
            studentId: string;
            indexNumber: string;
            systemHash: string;
            qrCodeUrl: string | null;
            verificationUrl: string | null;
            pdfUrl: string | null;
            generatedAt: Date;
            purpose: string | null;
            requestedById: string | null;
        };
        student: {
            user: {
                id: string;
                createdAt: Date;
                email: string;
                phone: string | null;
                passwordHash: string;
                role: import(".prisma/client").$Enums.Role;
                isActive: boolean;
                lastLoginAt: Date | null;
                updatedAt: Date;
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
        };
        verificationUrl: string;
    }>;
    verify(hash: string): Promise<{
        valid: boolean;
        documentType: string;
        student: {
            firstName: string;
            lastName: string;
            indexNumber: string;
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
        generatedAt: Date;
        indexNumber?: undefined;
        message?: undefined;
    } | {
        valid: boolean;
        documentType: string;
        indexNumber: string;
        generatedAt: Date;
        student?: undefined;
        term?: undefined;
        message?: undefined;
    } | {
        valid: boolean;
        message: string;
        documentType?: undefined;
        student?: undefined;
        term?: undefined;
        generatedAt?: undefined;
        indexNumber?: undefined;
    }>;
}

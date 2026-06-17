import { ReportsService } from './reports.service';
import { GenerateReportCardDto, BatchGenerateDto, BuildTranscriptDto } from './dto/reports.dto';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    generateOne(dto: GenerateReportCardDto): Promise<{
        reportCard: {
            student: {
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
                isLocked: boolean;
                isActive: boolean;
                academicYearId: string;
                termNumber: import(".prisma/client").$Enums.TermNumber;
                startDate: Date;
                endDate: Date;
            };
        } & {
            id: string;
            systemHash: string;
            studentId: string;
            termId: string;
            documentType: import(".prisma/client").$Enums.DocumentType;
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
            createdAt: Date;
            updatedAt: Date;
        };
        grades: ({
            subject: {
                id: string;
                createdAt: Date;
                departmentId: string | null;
                name: string;
                isActive: boolean;
                code: string;
                type: import(".prisma/client").$Enums.SubjectType;
                description: string | null;
            };
        } & {
            id: string;
            studentId: string;
            termId: string;
            totalScore: number | null;
            createdAt: Date;
            updatedAt: Date;
            subjectId: string;
            classScore: number | null;
            examScore: number | null;
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
        attendance: {
            id: string;
            studentId: string;
            termId: string;
            daysPresent: number;
            daysAbsent: number;
            totalDays: number;
        };
        student: {
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string;
                phone: string | null;
                passwordHash: string;
                role: import(".prisma/client").$Enums.Role;
                isActive: boolean;
                lastLoginAt: Date | null;
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
            systemHash: string;
            studentId: string;
            qrCodeUrl: string | null;
            verificationUrl: string | null;
            pdfUrl: string | null;
            generatedAt: Date;
            indexNumber: string;
            purpose: string | null;
            requestedById: string | null;
        };
        student: {
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string;
                phone: string | null;
                passwordHash: string;
                role: import(".prisma/client").$Enums.Role;
                isActive: boolean;
                lastLoginAt: Date | null;
            };
            grades: ({
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
                    isLocked: boolean;
                    isActive: boolean;
                    academicYearId: string;
                    termNumber: import(".prisma/client").$Enums.TermNumber;
                    startDate: Date;
                    endDate: Date;
                };
                subject: {
                    id: string;
                    createdAt: Date;
                    departmentId: string | null;
                    name: string;
                    isActive: boolean;
                    code: string;
                    type: import(".prisma/client").$Enums.SubjectType;
                    description: string | null;
                };
            } & {
                id: string;
                studentId: string;
                termId: string;
                totalScore: number | null;
                createdAt: Date;
                updatedAt: Date;
                subjectId: string;
                classScore: number | null;
                examScore: number | null;
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
                        createdAt: Date;
                        isActive: boolean;
                        startDate: Date;
                        endDate: Date;
                        label: string;
                    };
                } & {
                    id: string;
                    isLocked: boolean;
                    isActive: boolean;
                    academicYearId: string;
                    termNumber: import(".prisma/client").$Enums.TermNumber;
                    startDate: Date;
                    endDate: Date;
                };
            } & {
                id: string;
                systemHash: string;
                studentId: string;
                termId: string;
                documentType: import(".prisma/client").$Enums.DocumentType;
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
                createdAt: Date;
                updatedAt: Date;
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
        };
        verificationUrl: string;
    }>;
    verify(hash: string): Promise<{
        valid: boolean;
        documentType: string;
        student: {
            indexNumber: string;
            firstName: string;
            lastName: string;
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
            isLocked: boolean;
            isActive: boolean;
            academicYearId: string;
            termNumber: import(".prisma/client").$Enums.TermNumber;
            startDate: Date;
            endDate: Date;
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

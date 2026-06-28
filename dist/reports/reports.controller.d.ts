import { ReportsService } from './reports.service';
import { GenerateReportCardDto, BatchGenerateDto, BuildTranscriptDto } from './dto/reports.dto';
declare class ReportGenerationQueryDto {
    form?: string;
    track?: string;
    classSectionId?: string;
    search?: string;
}
declare class SendNudgeDto {
    classSectionId: string;
    message?: string;
}
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    generateOne(dto: GenerateReportCardDto): Promise<{
        reportCard: {
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
            student: {
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
                email: string;
                phone: string | null;
                passwordHash: string;
                role: import(".prisma/client").$Enums.Role;
                isActive: boolean;
                lastLoginAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
            currentClass: {
                level: import(".prisma/client").$Enums.ClassLevel;
                name: string;
                id: string;
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
            indexNumber: string;
            studentId: string;
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
                email: string;
                phone: string | null;
                passwordHash: string;
                role: import(".prisma/client").$Enums.Role;
                isActive: boolean;
                lastLoginAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
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
    getStudentsForGeneration(query: ReportGenerationQueryDto): Promise<{
        id: string;
        indexNumber: string;
        firstName: string;
        lastName: string;
        middleName: string;
        currentClass: {
            level: import(".prisma/client").$Enums.ClassLevel;
            name: string;
            id: string;
        };
    }[]>;
    compileBatchReports(body: {
        classSectionId: string;
        termId: string;
    }): Promise<{
        total: number;
        succeeded: number;
        failedCount: number;
        failed: {
            studentId: string;
            indexNumber: string;
            error: any;
        }[];
    }>;
    getBlockingIssues(classSectionId: string): Promise<{
        type: string;
        message: string;
        severity: string;
    }[]>;
    sendNudgeToTeachers(dto: SendNudgeDto, userId: string): Promise<{
        sent: number;
        teacherIds: string[];
    }>;
}
export {};

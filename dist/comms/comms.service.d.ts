import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationChannel, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
export interface SendNotificationDto {
    studentIds?: string[];
    title: string;
    body: string;
    channel: NotificationChannel;
    isEmergency?: boolean;
}
export declare class CommsService {
    private prisma;
    private config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    sendNotification(dto: SendNotificationDto, sentById: string): Promise<{
        sent: number;
        delivered: number;
        failed: number;
    }>;
    private sendSms;
    broadcastEmergency(title: string, body: string, sentById: string): Promise<{
        sent: number;
        delivered: number;
        failed: number;
    }>;
    getStudentNotifications(studentId: string, requesterId?: string, requesterRole?: Role): Promise<{
        id: string;
        createdAt: Date;
        staffId: string | null;
        studentId: string | null;
        title: string;
        body: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        isRead: boolean;
        deliveredAt: Date | null;
        failedAt: Date | null;
        errorMsg: string | null;
        createdById: string | null;
    }[]>;
    markAsRead(notificationId: string): Promise<{
        id: string;
        createdAt: Date;
        staffId: string | null;
        studentId: string | null;
        title: string;
        body: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        isRead: boolean;
        deliveredAt: Date | null;
        failedAt: Date | null;
        errorMsg: string | null;
        createdById: string | null;
    }>;
    getUnreadForStaff(userId: string, role: Role): Promise<{
        id: string;
        createdAt: Date;
        staffId: string | null;
        studentId: string | null;
        title: string;
        body: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        isRead: boolean;
        deliveredAt: Date | null;
        failedAt: Date | null;
        errorMsg: string | null;
        createdById: string | null;
    }[]>;
    private getHODUserIdsForTeacher;
    sendHODAction(targetTeacherId: string, action: string, details: Record<string, any>, senderUserId: string): Promise<{
        id: string;
        createdAt: Date;
        staffId: string | null;
        studentId: string | null;
        title: string;
        body: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        isRead: boolean;
        deliveredAt: Date | null;
        failedAt: Date | null;
        errorMsg: string | null;
        createdById: string | null;
    }>;
    sendTeacherAction(recordId: string, action: string, message: string, className: string, senderUserId: string): Promise<{
        sent: number;
    }>;
    private getNotificationTitle;
    private getNotificationMessage;
    private getNotificationTitleForHOD;
    private getNotificationMessageForHOD;
    createTicket(dto: CreateSupportTicketDto, requesterId: string): Promise<{
        student: {
            user: {
                email: string;
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        studentId: string;
        title: string;
        status: string;
        resolvedAt: Date | null;
        createdById: string | null;
        category: string;
        priority: string;
        assignedTo: string | null;
    }>;
    getStudentTickets(studentId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        studentId: string;
        title: string;
        status: string;
        resolvedAt: Date | null;
        createdById: string | null;
        category: string;
        priority: string;
        assignedTo: string | null;
    }[]>;
    getTicketById(ticketId: string): Promise<{
        student: {
            user: {
                email: string;
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        studentId: string;
        title: string;
        status: string;
        resolvedAt: Date | null;
        createdById: string | null;
        category: string;
        priority: string;
        assignedTo: string | null;
    }>;
    listTickets(query: {
        status?: string;
        category?: string;
        priority?: string;
    }, requesterId: string, role: Role): Promise<({
        student: {
            user: {
                email: string;
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        studentId: string;
        title: string;
        status: string;
        resolvedAt: Date | null;
        createdById: string | null;
        category: string;
        priority: string;
        assignedTo: string | null;
    })[]>;
    updateTicketStatus(ticketId: string, dto: {
        status: string;
        notes?: string;
    }, userId: string, role: Role): Promise<{
        student: {
            user: {
                email: string;
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
        createdAt: Date;
        updatedAt: Date;
        description: string;
        studentId: string;
        title: string;
        status: string;
        resolvedAt: Date | null;
        createdById: string | null;
        category: string;
        priority: string;
        assignedTo: string | null;
    }>;
    addTicketReply(ticketId: string, dto: {
        message: string;
        priority?: string;
    }, userId: string, role: Role): Promise<{
        reply: {
            message: string;
            repliedBy: string;
            repliedAt: Date;
            responderRole: "SUPER_ADMIN" | "HEADMASTER" | "HOD" | "TEACHER";
        };
        student: {
            user: {
                email: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        studentId: string;
        title: string;
        status: string;
        resolvedAt: Date | null;
        createdById: string | null;
        category: string;
        priority: string;
        assignedTo: string | null;
    }>;
    getAnalyticsPulse(academicYearId?: string, userId?: string): Promise<{
        enrollment: {
            class: string;
            count: number;
            capacity: number;
        }[];
        subjectPerformance: {
            subjectId: string;
            averageScore: string;
            studentCount: number;
        }[];
        attendance: {
            daysPresent: number;
            totalDays: number;
        };
        teacherAssignments: {
            id: any;
            subjectId: any;
            subjectName: any;
            classSectionId: any;
            className: string;
        }[];
        recentActivity: {
            id: string;
            time: string;
            event: string;
            type: "security" | "academic" | "system" | "comm";
        }[];
    }>;
}

import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';
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
    getStudentNotifications(studentId: string, unreadOnly?: boolean): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        studentId: string | null;
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
        title: string;
        studentId: string | null;
        body: string;
        channel: import(".prisma/client").$Enums.NotificationChannel;
        isRead: boolean;
        deliveredAt: Date | null;
        failedAt: Date | null;
        errorMsg: string | null;
        createdById: string | null;
    }>;
    createTicket(dto: CreateSupportTicketDto, studentId: string): Promise<{
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
            bio: string | null;
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
        title: string;
        studentId: string;
        category: string;
        priority: string;
        createdById: string | null;
        status: string;
        assignedTo: string | null;
        resolvedAt: Date | null;
    }>;
    getStudentTickets(studentId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        title: string;
        studentId: string;
        category: string;
        priority: string;
        createdById: string | null;
        status: string;
        assignedTo: string | null;
        resolvedAt: Date | null;
    }[]>;
    getAnalyticsPulse(academicYearId?: string): Promise<{
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
    }>;
}

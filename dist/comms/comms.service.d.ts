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
    getStudentNotifications(studentId: string, unreadOnly?: boolean, requesterId?: string, requesterRole?: Role): Promise<{
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
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            departmentId: string | null;
            indexNumber: string;
            bio: string | null;
            admissionDate: Date;
            currentClassId: string | null;
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
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            departmentId: string | null;
            indexNumber: string;
            bio: string | null;
            admissionDate: Date;
            currentClassId: string | null;
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
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            departmentId: string | null;
            indexNumber: string;
            bio: string | null;
            admissionDate: Date;
            currentClassId: string | null;
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
            firstName: string;
            lastName: string;
            middleName: string | null;
            gender: import(".prisma/client").$Enums.Gender;
            dateOfBirth: Date | null;
            photoUrl: string | null;
            departmentId: string | null;
            indexNumber: string;
            bio: string | null;
            admissionDate: Date;
            currentClassId: string | null;
            archivedAt: Date | null;
        };
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
    }>;
}

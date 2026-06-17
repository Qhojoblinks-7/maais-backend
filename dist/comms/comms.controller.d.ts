import { CommsService } from './comms.service';
import { SendNotificationDto, EmergencyNotificationDto } from './dto/comms.dto';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
export declare class CommsController {
    private commsService;
    constructor(commsService: CommsService);
    sendNotification(dto: SendNotificationDto, userId: string): Promise<{
        sent: number;
        delivered: number;
        failed: number;
    }>;
    emergency(dto: EmergencyNotificationDto, userId: string): Promise<{
        sent: number;
        delivered: number;
        failed: number;
    }>;
    getNotifications(studentId: string, unreadOnly: boolean): Promise<{
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
    markRead(id: string): Promise<{
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
    getPulse(academicYearId?: string): Promise<{
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
    createTicket(dto: CreateSupportTicketDto, userId: string): Promise<{
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
    getMyTickets(userId: string): Promise<{
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
}

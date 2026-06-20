import { Role } from '@prisma/client';
import { CommsService } from './comms.service';
import { SendNotificationDto, EmergencyNotificationDto, HODActionDto, TeacherActionDto } from './dto/comms.dto';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto, AddTicketReplyDto, TicketQueryDto } from './dto/ticket.dto';
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
    getNotifications(studentId: string, _unreadOnly: boolean, userId: string, role: Role): Promise<{
        id: string;
        createdAt: Date;
        staffId: string | null;
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
        staffId: string | null;
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
    getUnread(userId: string, role: Role): Promise<{
        id: string;
        createdAt: Date;
        staffId: string | null;
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
    sendHODAction(dto: HODActionDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        staffId: string | null;
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
    sendTeacherAction(dto: TeacherActionDto, userId: string): Promise<{
        sent: number;
    }>;
    getPulse(academicYearId?: string, userId?: string): Promise<{
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
    createTicket(dto: CreateSupportTicketDto, userId: string): Promise<{
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
        status: string;
        category: string;
        priority: string;
        createdById: string | null;
        assignedTo: string | null;
        resolvedAt: Date | null;
    }>;
    getMyTickets(userId: string, role: Role): Promise<({
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
        status: string;
        category: string;
        priority: string;
        createdById: string | null;
        assignedTo: string | null;
        resolvedAt: Date | null;
    })[]>;
    listTickets(query: TicketQueryDto, userId: string, role: Role): Promise<({
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
        status: string;
        category: string;
        priority: string;
        createdById: string | null;
        assignedTo: string | null;
        resolvedAt: Date | null;
    })[]>;
    updateTicketStatus(id: string, dto: UpdateTicketStatusDto, userId: string, role: Role): Promise<{
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
        status: string;
        category: string;
        priority: string;
        createdById: string | null;
        assignedTo: string | null;
        resolvedAt: Date | null;
    }>;
    addReply(id: string, dto: AddTicketReplyDto, userId: string, role: Role): Promise<{
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
            bio: string | null;
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
        title: string;
        studentId: string;
        status: string;
        category: string;
        priority: string;
        createdById: string | null;
        assignedTo: string | null;
        resolvedAt: Date | null;
    }>;
}

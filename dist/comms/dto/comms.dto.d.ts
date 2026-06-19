import { NotificationChannel } from '@prisma/client';
export declare class SendNotificationDto {
    studentIds?: string[];
    title: string;
    body: string;
    channel: NotificationChannel;
}
export declare class EmergencyNotificationDto {
    title: string;
    message: string;
}
export declare class PromotionDto {
    academicYearId: string;
}
export declare class HODActionDto {
    teacherId: string;
    action: string;
    details?: Record<string, any>;
}
export declare class TeacherActionDto {
    recordId: string;
    action: string;
    message?: string;
    className?: string;
}

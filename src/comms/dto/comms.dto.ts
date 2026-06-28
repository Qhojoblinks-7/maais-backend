import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class SendNotificationDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Leave empty to notify all students',
  })
  @IsOptional()
  @IsArray()
  studentIds?: string[];

  @ApiProperty({ example: 'Term 2 Results Ready' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Your Term 2 report cards are now available.' })
  @IsString()
  body: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;
}

export class EmergencyNotificationDto {
  @ApiProperty({ example: 'School Closure' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'School is closed tomorrow due to weather.' })
  @IsString()
  message: string;
}

export class PromotionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYearId?: string;
}

export class HODActionDto {
  @ApiProperty({ example: 'TCH-2024-001' })
  @IsString()
  teacherId: string;

  @ApiProperty({ example: 'GRADE_SUBMITTED_TO_HOD' })
  @IsString()
  action: string;

  @ApiPropertyOptional()
  @IsOptional()
  details?: Record<string, any>;
}

export class TeacherActionDto {
  @ApiProperty({ example: 'uuid-of-record' })
  @IsString()
  recordId: string;

  @ApiProperty({ example: 'GRADE_REVISION_REQUESTED' })
  @IsString()
  action: string;

  @ApiPropertyOptional()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  className?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'MSHTS/2024/001' })
  @IsString()
  @IsNotEmpty()
  indexNumber: string;

  @ApiPropertyOptional({ example: 'GHA-123456789' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ example: 'Kwame' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Mensah' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: 'Kofi' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ example: '2008-01-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'NORMAL' })
  @IsOptional()
  @IsString()
  disability?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canReadBraille?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['Mathematics', 'English'] })
  @IsOptional()
  subjects?: string[];

  @ApiPropertyOptional({ example: 'student@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Student@2024!' })
  @IsString()
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentClassId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  // Parent Info
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentFirstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentLastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  parentEmail?: string;

  @ApiPropertyOptional({ example: 'Father' })
  @IsOptional()
  @IsString()
  parentRelationship?: string;
}

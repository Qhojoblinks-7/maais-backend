import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { TermNumber, ClassLevel, SubjectType } from '@prisma/client';

export class CreateAcademicYearDto {
  @ApiProperty({ example: '2024/2025' })
  @IsString()
  label: string;

  @ApiProperty({ example: '2024-09-02' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-07-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: '2024-09-02', description: 'Start date for Semester 1' })
  @IsOptional()
  @IsDateString()
  semester1Start?: string;

  @ApiPropertyOptional({ example: '2025-01-15', description: 'End date for Semester 1' })
  @IsOptional()
  @IsDateString()
  semester1End?: string;

  @ApiPropertyOptional({ example: '2025-01-20', description: 'Start date for Semester 2' })
  @IsOptional()
  @IsDateString()
  semester2Start?: string;

  @ApiPropertyOptional({ example: '2025-07-31', description: 'End date for Semester 2' })
  @IsOptional()
  @IsDateString()
  semester2End?: string;
}

export class CreateTermDto {
  @ApiProperty()
  @IsString()
  academicYearId: string;

  @ApiProperty({ enum: TermNumber })
  @IsEnum(TermNumber)
  termNumber: TermNumber;

  @ApiProperty({ example: '2024-09-02' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-12-20' })
  @IsDateString()
  endDate: string;
}

export class UpdateAcademicYearDto {
  @ApiPropertyOptional({ example: '2024/2025' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: '2024-09-02' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-07-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateTermDto {
  @ApiPropertyOptional({ example: '2024-09-02' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-20' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Science' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'SCI' })
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  name: string;

  @ApiProperty({
    example: '402',
    description: 'WAEC subject code (e.g., 402 for Mathematics)',
  })
  @IsString()
  code: string;

  @ApiProperty({ enum: SubjectType })
  @IsEnum(SubjectType)
  type: SubjectType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Applicable programs (e.g., ["Science", "General Arts"])',
  })
  @IsOptional()
  applicablePrograms?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSubjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class CreateClassSectionDto {
  @ApiProperty({ example: '1A' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ClassLevel })
  @IsEnum(ClassLevel)
  level: ClassLevel;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  capacity?: number;

  @ApiPropertyOptional({ example: 'Science' })
  @IsOptional()
  @IsString()
  program?: string;

  @ApiPropertyOptional({ example: 'Gold' })
  @IsOptional()
  @IsString()
  track?: string;
}

export class AssignTeacherDto {
  @ApiProperty()
  @IsString()
  teacherId: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsString()
  classSectionId: string;

  @ApiProperty()
  @IsString()
  academicYearId: string;
}

export class AssignClassTeacherDto {
  @ApiProperty()
  @IsString()
  staffId: string;
}

export class UpdateClassSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ClassLevel })
  @IsOptional()
  @IsEnum(ClassLevel)
  level?: ClassLevel;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  capacity?: number;

  @ApiPropertyOptional({ example: 'Science' })
  @IsOptional()
  @IsString()
  program?: string;

  @ApiPropertyOptional({ example: 'Gold' })
  @IsOptional()
  @IsString()
  track?: string;
}

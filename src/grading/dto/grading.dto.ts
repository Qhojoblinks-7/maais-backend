import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertGradeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  version?: number;

  @ApiPropertyOptional({ example: 25, description: 'Class score out of 30' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  classScore?: number;

  @ApiPropertyOptional({ example: 55, description: 'Exam score out of 70' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(70)
  examScore?: number;

  @ApiPropertyOptional({ example: 'Outstanding performance' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasObservation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observationText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  labSafety?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  flagged?: boolean;
}

export class BulkUpsertGradeDto {
  @ApiProperty({ type: [UpsertGradeDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpsertGradeDto)
  entries: UpsertGradeDto[];
}

export class CorrectGradeDto {
  @ApiProperty()
  @IsString()
  gradeEntryId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  version?: number;

  @ApiProperty({ enum: ['classScore', 'examScore', 'remark'] })
  @IsEnum(['classScore', 'examScore', 'remark'])
  fieldChanged: 'classScore' | 'examScore' | 'remark';

  @ApiProperty()
  @IsString()
  newValue: string;

  @ApiProperty({ example: 'Score was incorrectly entered' })
  @IsString()
  reason: string;
}

export class LockGradeDto {
  @ApiProperty()
  @IsString()
  gradeEntryId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  version?: number;
}

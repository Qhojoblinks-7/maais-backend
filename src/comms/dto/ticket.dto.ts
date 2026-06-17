import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTicketStatusDto {
  @ApiProperty({ example: 'RESOLVED', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: 'Resolved after meeting with student.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddTicketReplyDto {
  @ApiProperty({ example: 'Please provide more details about your issue.' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ example: 'HIGH', enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class TicketQueryDto {
  @ApiPropertyOptional({ example: 'OPEN' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Academic' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'HIGH', enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @IsOptional()
  @IsString()
  priority?: string;
}

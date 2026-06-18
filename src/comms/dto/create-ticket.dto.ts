import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Missing grade for General Agric' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'My grade was not recorded...' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    enum: ['Academic', 'Technical', 'Finance', 'General'],
    default: 'General',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' })
  @IsOptional()
  @IsString()
  priority?: string;
}

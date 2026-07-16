import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';

export class BulkImportStaffDto {
  @ApiProperty({ type: [Object], description: 'Array of staff records' })
  @IsArray()
  staff: any[];
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApprovalsService } from './approvals.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateApprovalDto {
  @ApiProperty({ example: 'TCH-2024-001' })
  @IsString()
  teacherId: string;

  @ApiProperty({ example: 'Request to override grade for Student X' })
  @IsString()
  detail: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({
    enum: [
      'grade_change',
      'enrollment',
      'curriculum',
      'resource_allocation',
      'policy_exception',
      'other',
    ],
  })
  @IsOptional()
  @IsEnum([
    'grade_change',
    'enrollment',
    'curriculum',
    'resource_allocation',
    'policy_exception',
    'other',
  ])
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;
}

class ResolveApprovalDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsEnum(['approved', 'rejected'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

class ApprovalQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
@UseGuards()
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'List approval requests with optional filters' })
  findAll(@Query() query: ApprovalQueryDto) {
    return this.approvalsService.findAll(query);
  }

  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Get approval statistics' })
  getStats() {
    return this.approvalsService.getStats();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD, Role.TEACHER)
  @ApiOperation({ summary: 'Create a new approval request' })
  create(@Body() dto: CreateApprovalDto, @CurrentUser('id') userId: string) {
    return this.approvalsService.create(dto, userId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Get a single approval request' })
  findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(id);
  }

  @Patch(':id/resolve')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Resolve an approval request (approve/reject)' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveApprovalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.approvalsService.resolve(id, dto, userId);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Delete an approval request' })
  remove(@Param('id') id: string) {
    return this.approvalsService.remove(id);
  }
}

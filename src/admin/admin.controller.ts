import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';

class FreezeDepartmentDto {
  @ApiPropertyOptional({ description: 'Optional reason for freezing' })
  @IsOptional()
  @IsString()
  reason?: string;
}

class TransferTeacherDto {
  @ApiProperty({ description: 'Teacher staff profile ID' })
  @IsString()
  teacherId: string;

  @ApiProperty({ description: 'Source department ID' })
  @IsString()
  fromDepartmentId: string;
}

class AuthorizeTemplateDto {
  @ApiProperty({ description: 'Template name or identifier' })
  @IsString()
  template: string;
}

class StrategyPulseDto {
  @ApiPropertyOptional({ description: 'Optional department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;
}

class ResetCredentialsDto {
  @ApiPropertyOptional({ description: 'Optional new temporary password' })
  @IsOptional()
  @IsString()
  temporaryPassword?: string;
}

class AuditLogQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

class DeleteDepartmentDto {
  @ApiPropertyOptional({ description: 'Optional reason for deletion' })
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('departments/:id/freeze')
  @Roles(Role.HEADMASTER)
  @ApiOperation({
    summary: 'Freeze a department (suspend assessment operations)',
  })
  freezeDepartment(
    @Param('id') id: string,
    @Body() dto: FreezeDepartmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.freezeDepartment(id, dto.reason, userId);
  }

  @Post('departments/:id/transfer-teacher')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Transfer a teacher to another department' })
  transferTeacher(
    @Param('id') toDeptId: string,
    @Body() dto: TransferTeacherDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.transferTeacher(toDeptId, dto, userId);
  }

  @Post('departments/:id/template')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Authorize a department template update' })
  authorizeTemplate(
    @Param('id') deptId: string,
    @Body() dto: AuthorizeTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.authorizeTemplate(deptId, dto.template, userId);
  }

  @Post('strategy-pulse')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Upload strategy pulse files' })
  uploadStrategyPulse(
    @Body() dto: StrategyPulseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.uploadStrategyPulse(dto.departmentId, userId);
  }

  @Post('staff/:id/reset-credentials')
  @Roles(Role.HEADMASTER)
  @ApiOperation({
    summary: 'Reset staff credentials and generate temporary password',
  })
  resetCredentials(
    @Param('id') staffId: string,
    @Body() dto: ResetCredentialsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.resetCredentials(
      staffId,
      dto.temporaryPassword,
      userId,
    );
  }

  @Get('audit-logs')
  @Roles(Role.HEADMASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system-wide audit logs' })
  getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('settings')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Get admin settings and profile' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Get('settings/freeze')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get system freeze status' })
  getSystemFreeze() {
    return this.adminService.getSystemFreeze();
  }

  @Post('settings/freeze')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Toggle emergency system freeze' })
  toggleSystemFreeze(@Body() body: { enabled: boolean; reason?: string }) {
    return this.adminService.toggleSystemFreeze(body.enabled, body.reason);
  }

  @Patch('settings/mfa')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Update MFA setting' })
  updateMfa(@Body() body: { enabled: boolean }) {
    return this.adminService.updateMfa(body.enabled);
  }

  @Patch('settings/maintenance')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Toggle maintenance mode' })
  toggleMaintenance(@Body() body: { enabled: boolean }) {
    return this.adminService.toggleMaintenance(body.enabled);
  }

  @Post('settings/credentials')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Update admin credentials' })
  updateCredentials(
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.adminService.updateCredentials(body);
  }

  @Patch('departments/:id/hod')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Assign or revoke HOD for a department' })
  assignHOD(
    @Param('id') deptId: string,
    @Body() dto: { staffId: string | null },
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.assignHOD(deptId, dto.staffId, userId);
  }

  @Delete('departments/:id')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Delete a department' })
  deleteDepartment(
    @Param('id') deptId: string,
    @Body() dto: DeleteDepartmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.deleteDepartment(deptId, dto.reason, userId);
  }
}

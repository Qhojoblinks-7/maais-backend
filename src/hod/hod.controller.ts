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
import { HODService } from './hod.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('HOD')
@ApiBearerAuth()
@Controller('hod')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HODController {
  constructor(private hodService: HODService) {}

  @Get('me/context')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get HOD context' })
  getContext(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getContext(userId, role);
  }

  @Get('department-progress')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get department progress overview' })
  getDepartmentProgress(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('academicYearId') academicYearId?: string,
    @Query('termNumber') termNumber?: string,
  ) {
    return this.hodService.getDepartmentProgress(userId, role, page, limit, academicYearId, termNumber);
  }

  @Get('academic-years')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get all academic years for HOD' })
  getAllAcademicYears(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getAllAcademicYears(userId, role);
  }

  @Get('grade-revisions')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get grade revision requests for HOD review' })
  getGradeRevisions(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getGradeRevisions(userId, role);
  }

  @Post('records/:recordId/approve')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Approve a grade revision' })
  approveGradeRevision(
    @Param('recordId') recordId: string,
    @Body('comment') comment: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.approveGradeRevision(recordId, comment, userId, role);
  }

  @Post('records/:recordId/reject')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Reject a grade revision' })
  rejectGradeRevision(
    @Param('recordId') recordId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.rejectGradeRevision(recordId, reason, userId, role);
  }

  @Patch('records/:recordId/comment')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Add HOD comment to a record' })
  updateHODComment(
    @Param('recordId') recordId: string,
    @Body('comment') comment: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.updateHODComment(recordId, comment, userId, role);
  }

  @Post('lock-matrix/:termId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lock a term' })
  lockTerm(
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.lockTerm(termId, userId, role);
  }

  @Post('unlock-matrix/:termId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Unlock a term' })
  unlockTerm(
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.unlockTerm(termId, userId, role);
  }

  @Get('lock-matrix/:termId/validate')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Validate if term can be locked' })
  validateLock(
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.validateLock(termId, userId, role);
  }

  @Get('locked-terms')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get all locked terms' })
  getLockedTerms(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getLockedTerms(userId, role);
  }

  @Get('teachers/submissions')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get teacher submission status for department' })
  getTeacherSubmissionStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('academicYearId') academicYearId?: string,
    @Query('termNumber') termNumber?: string,
  ) {
    return this.hodService.getTeacherSubmissionStatus(userId, role, academicYearId, termNumber);
  }

  @Get('teachers')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get department teachers' })
  getDepartmentTeachers(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('search') search?: string,
  ) {
    return this.hodService.getDepartmentTeachers(userId, role, { search });
  }

  @Post('teachers/:teacherId/reset-password')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reset teacher password' })
  resetTeacherPassword(
    @Param('teacherId') teacherId: string,
    @Body('newPassword') newPassword: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.resetTeacherPassword(teacherId, newPassword, userId, role);
  }

  @Get('audit-logs')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get audit logs for department' })
  getAuditLogs(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() params?: any,
  ) {
    return this.hodService.getAuditLogs(userId, role, params);
  }

  @Get('compliance/cohort-performance')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get longitudinal cohort performance data for compliance' })
  getComplianceCohortPerformance(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getComplianceCohortPerformance(userId, role);
  }

  @Get('compliance/timeline')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get department archive compliance timeline' })
  getComplianceTimeline(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getComplianceTimeline(userId, role);
  }

  @Get('promotion-metrics')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get senior class promotion metrics for department' })
  getPromotionMetrics(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getPromotionMetrics(userId, role);
  }

  @Get('intervention-alerts')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get intervention alerts for department' })
  getInterventionAlerts(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('semester') semester?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('termNumber') termNumber?: string,
  ) {
    return this.hodService.getInterventionAlerts(userId, role, { startDate, endDate, semester, academicYearId, termNumber });
  }

  @Get('settings')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get HOD settings' })
  getHODSettings(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getHODSettings(userId, role);
  }

  @Patch('settings')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Update HOD settings' })
  updateHODSettings(
    @Body() settings: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.updateHODSettings(settings, userId, role);
  }

  @Post('settings/change-password')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Change HOD password' })
  changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.changePassword(body.currentPassword, body.newPassword, userId, role);
  }

  @Post('settings/mfa/enroll')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Enroll MFA for HOD' })
  mfaEnroll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.mfaEnroll(userId, role);
  }

  @Post('settings/mfa/verify')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Verify MFA code' })
  mfaVerify(
    @Body('code') code: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.mfaVerify(code, userId, role);
  }

  @Get('settings/sessions')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get HOD active sessions' })
  getActiveSessions(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getActiveSessions(userId, role);
  }

  @Delete('settings/sessions/:sessionId')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Revoke a session' })
  revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.revokeSession(sessionId, userId, role);
  }

  @Get('system-health')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get system health status' })
  getSystemHealth(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getSystemHealth(userId, role);
  }

  @Get('escalations')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get escalated issues' })
  getEscalatedIssues(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() params?: any,
  ) {
    return this.hodService.getEscalatedIssues(userId, role, params);
  }

  @Post('impersonate/:teacherId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Start impersonating a teacher' })
  impersonateTeacher(
    @Param('teacherId') teacherId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body?: { reason?: string },
  ) {
    return this.hodService.impersonateTeacher(teacherId, body || {}, userId, role);
  }

  @Post('impersonate/stop')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Stop impersonating teacher' })
  stopImpersonation(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.stopImpersonation(userId, role);
  }

  @Get('archive')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get archived department data' })
  getArchivedDepartmentData(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() params?: any,
  ) {
    return this.hodService.getArchivedDepartmentData(userId, role, params);
  }

  @Get('archive/promotions')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get promotion recommendations' })
  getPromotionRecommendations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() params?: any,
  ) {
    return this.hodService.getPromotionRecommendations(userId, role, params);
  }

  @Post('export-waec/:termId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export WAEC CSV for term' })
  exportWAECCSV(
    @Param('termId') termId: string,
    @Query('class') className: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.exportWAECCSV(termId, className, userId, role);
  }
}

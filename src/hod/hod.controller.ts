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
  Res,
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
    return this.hodService.getDepartmentProgress(
      userId,
      role,
      page,
      limit,
      academicYearId,
      termNumber,
    );
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
    return this.hodService.approveGradeRevision(
      recordId,
      comment,
      userId,
      role,
    );
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

  @Post('lock-class/:classId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lock a class matrix' })
  lockClassMatrix(
    @Param('classId') classId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.lockClassMatrix(classId, userId, role);
  }

  @Post('unlock-class/:classId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Unlock a class matrix' })
  unlockClassMatrix(
    @Param('classId') classId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.unlockClassMatrix(classId, userId, role);
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

  @Get('grades/compare')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Compare grades between two terms' })
  getGradeComparison(
    @Query('subjectId') subjectId: string,
    @Query('termA') termA: string,
    @Query('termB') termB: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getGradeComparison(
      subjectId,
      termA,
      termB,
      userId,
      role,
    );
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
    return this.hodService.getTeacherSubmissionStatus(
      userId,
      role,
      academicYearId,
      termNumber,
    );
  }

  @Get('teachers')
  @Roles(Role.HOD, Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Get department teachers' })
  getDepartmentTeachers(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('search') search?: string,
  ) {
    return this.hodService.getDepartmentTeachers(userId, role, { search });
  }

  @Get('teachers/submissions/trends')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get teacher submission trends by month' })
  getTeacherSubmissionTrends(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getTeacherSubmissionTrends(userId, role);
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
    return this.hodService.resetTeacherPassword(
      teacherId,
      newPassword,
      userId,
      role,
    );
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

  @Post('audit-logs')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Create audit log entry' })
  createAuditLog(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body()
    data: { action: string; entity: string; entityId: string; payload?: any },
  ) {
    return this.hodService.createAuditLog(userId, role, data);
  }

  @Patch('audit-logs/:logId/comment')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Add HOD comment to audit log' })
  addAuditLogComment(
    @Param('logId') logId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body('comment') comment: string,
  ) {
    return this.hodService.addAuditLogComment(userId, role, logId, comment);
  }

  @Get('compliance/cohort-performance')
  @Roles(Role.HOD)
  @ApiOperation({
    summary: 'Get longitudinal cohort performance data for compliance',
  })
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
  @ApiOperation({
    summary: 'Get senior class promotion metrics for department',
  })
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
    return this.hodService.getInterventionAlerts(userId, role, {
      startDate,
      endDate,
      semester,
      academicYearId,
      termNumber,
    });
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
    return this.hodService.changePassword(
      body.currentPassword,
      body.newPassword,
      userId,
      role,
    );
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

  @Post('escalations')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create escalation' })
  createEscalation(
    @Body() body: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.createEscalation(userId, role, body);
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
    return this.hodService.impersonateTeacher(
      teacherId,
      body || {},
      userId,
      role,
    );
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

  @Get('impersonate/active')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get active impersonations' })
  getActiveImpersonations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getActiveImpersonations(userId, role);
  }

  @Get('support/tickets')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get support tickets' })
  getSupportTickets(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() params?: any,
  ) {
    return this.hodService.getSupportTickets(userId, role, params);
  }

  @Post('support/tickets')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create support ticket' })
  createSupportTicket(
    @Body() ticket: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.createSupportTicket(userId, role, ticket);
  }

  @Patch('support/tickets/:ticketId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update support ticket' })
  updateSupportTicket(
    @Param('ticketId') ticketId: string,
    @Body() patch: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.updateSupportTicket(userId, role, ticketId, patch);
  }

  @Post('support/tickets/:ticketId/escalate')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Escalate a ticket' })
  escalateTicket(
    @Param('ticketId') ticketId: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.escalateTicket(userId, role, ticketId, body);
  }

  @Get('contact-channels')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get contact channels' })
  getContactChannels(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getContactChannels(userId, role);
  }

  @Patch('contact-channels')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Update contact channels' })
  updateContactChannels(
    @Body() channels: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.updateContactChannels(userId, role, channels);
  }

  @Get('students/:studentId/academic-history')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get student academic history' })
  getStudentAcademicHistory(
    @Param('studentId') studentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.getStudentAcademicHistory(userId, role, studentId);
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
  async exportWAECCSV(
    @Param('termId') termId: string,
    @Query('class') className: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: any,
  ) {
    const csv = await this.hodService.exportWAECCSV(
      termId,
      className,
      userId,
      role,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="WAEC_${className}_${termId}.csv"`,
    );
    return res.send(csv);
  }

  @Get('export-waec/:termId/department')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export department WAEC CSV for term' })
  exportDepartmentWAECCSV(
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.exportDepartmentWAECCSV(termId, userId, role);
  }

  @Get('export-waec/:termId/pdf')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export WAEC PDF for a class' })
  exportWAECPDF(
    @Param('termId') termId: string,
    @Query('class') className: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.exportWAECPDF(termId, className, userId, role);
  }

  @Get('export-waec/:termId/pdf/department')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export department WAEC PDF for term' })
  exportDepartmentWAECPDF(
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.exportDepartmentWAECPDF(termId, userId, role);
  }

  @Post('intervention-alerts/:alertId/resolve')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Resolve an intervention alert' })
  resolveAlert(
    @Param('alertId') alertId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.resolveAlert(alertId, userId, role);
  }

  @Post('intervention-alerts/:alertId/notes')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Add counseling note to intervention alert' })
  addCounselingNote(
    @Param('alertId') alertId: string,
    @Body('text') text: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.hodService.addCounselingNote(alertId, text, userId, role);
  }
}

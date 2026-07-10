import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HODContextService } from './hod-context.service';
import { HODGradeService } from './hod-grades.service';
import { HODTeacherService } from './hod-teachers.service';
import { HODArchiveService } from './hod-archive.service';
import { HODComplianceService } from './hod-compliance.service';
import { HODExportService } from './hod-export.service';
import { HODSettingsService } from './hod-settings.service';

@Injectable()
export class HODService {
  constructor(
    private context: HODContextService,
    private grades: HODGradeService,
    private teachers: HODTeacherService,
    private archive: HODArchiveService,
    private compliance: HODComplianceService,
    private exportService: HODExportService,
    private settings: HODSettingsService,
  ) {}

  async getContext(userId: string, role: Role) {
    return this.context.getContext(userId, role);
  }

  async getAllAcademicYears(userId: string, role: Role) {
    return this.context.getAllAcademicYears(userId, role);
  }

  async getDepartmentProgress(
    userId: string,
    role: Role,
    page = 1,
    limit = 50,
    academicYearId?: string,
    termNumber?: string,
  ) {
    return this.context.getDepartmentProgress(
      userId,
      role,
      page,
      limit,
      academicYearId,
      termNumber,
    );
  }

  async getGradeRevisions(userId: string, role: Role) {
    return this.grades.getGradeRevisions(userId, role);
  }

  async createHODGradeRevision(
    body: {
      classSectionId?: string;
      gradeEntryId?: string;
      issue: string;
      severity: string;
    },
    userId: string,
    role: Role,
  ) {
    return this.grades.createHODGradeRevision(body, userId, role);
  }

  async approveGradeEntry(
    gradeEntryId: string,
    comment: string,
    userId: string,
    role: Role,
  ) {
    return this.grades.approveGradeEntry(gradeEntryId, comment, userId, role);
  }

  async approveGradeRevision(
    recordId: string,
    comment: string,
    userId: string,
    role: Role,
  ) {
    return this.grades.approveGradeRevision(recordId, comment, userId, role);
  }

  async rejectGradeRevision(
    recordId: string,
    reason: string,
    userId: string,
    role: Role,
  ) {
    return this.grades.rejectGradeRevision(recordId, reason, userId, role);
  }

  async updateHODComment(
    recordId: string,
    comment: string,
    userId: string,
    role: Role,
  ) {
    return this.grades.updateHODComment(recordId, comment, userId, role);
  }

  async lockTerm(termId: string, userId: string, role: Role) {
    return this.grades.lockTerm(termId, userId, role);
  }

  async lockClassMatrix(classSectionId: string, userId: string, role: Role) {
    return this.grades.lockClassMatrix(classSectionId, userId, role);
  }

  async unlockTerm(termId: string, userId: string, role: Role) {
    return this.grades.unlockTerm(termId, userId, role);
  }

  unlockClassMatrix(classSectionId: string, userId: string, role: Role) {
    return this.grades.unlockClassMatrix(classSectionId, userId, role);
  }

  async validateLock(termId: string, userId: string, role: Role) {
    return this.grades.validateLock(termId, userId, role);
  }

  async getLockedTerms(userId: string, role: Role) {
    return this.grades.getLockedTerms(userId, role);
  }

  async getTeacherSubmissionStatus(
    userId: string,
    role: Role,
    academicYearId?: string,
    termNumber?: string,
  ) {
    return this.teachers.getTeacherSubmissionStatus(
      userId,
      role,
      academicYearId,
      termNumber,
    );
  }

  async getDepartmentTeachers(
    userId: string,
    role: Role,
    params?: { search?: string },
  ) {
    return this.teachers.getDepartmentTeachers(userId, role, params);
  }

  async resetTeacherPassword(
    teacherId: string,
    newPassword: string,
    userId: string,
    role: Role,
  ) {
    return this.teachers.resetTeacherPassword(
      teacherId,
      newPassword,
      userId,
      role,
    );
  }

  async getAuditLogs(userId: string, role: Role, params?: any) {
    return this.teachers.getAuditLogs(userId, role, params);
  }

  async getTeacherSubmissionTrends(userId: string, role: Role) {
    return this.teachers.getTeacherSubmissionTrends(userId, role);
  }

  async getInterventionAlerts(userId: string, role: Role, filters?: any) {
    return this.archive.getInterventionAlerts(userId, role, filters);
  }

  async getArchivedDepartmentData(userId: string, role: Role, params?: any) {
    return this.archive.getArchivedDepartmentData(userId, role, params);
  }

  getHODSettings(userId: string, role: Role) {
    return this.settings.getHODSettings(userId, role);
  }

  updateHODSettings(settings: any, userId: string, role: Role) {
    return this.settings.updateHODSettings(settings, userId, role);
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    userId: string,
    role: Role,
  ) {
    return this.settings.changePassword(
      currentPassword,
      newPassword,
      userId,
      role,
    );
  }

  mfaEnroll(userId: string, role: Role) {
    return this.settings.mfaEnroll(userId, role);
  }

  mfaVerify(code: string, userId: string, role: Role) {
    return this.settings.mfaVerify(code, userId, role);
  }

  getActiveSessions(userId: string, role: Role) {
    return this.settings.getActiveSessions(userId, role);
  }

  revokeSession(sessionId: string, userId: string, role: Role) {
    return this.settings.revokeSession(sessionId, userId, role);
  }

  getSystemHealth(userId: string, role: Role) {
    return this.settings.getSystemHealth(userId, role);
  }

  impersonateTeacher(
    teacherId: string,
    body: { reason?: string },
    userId: string,
    role: Role,
  ) {
    return this.settings.impersonateTeacher(teacherId, body, userId, role);
  }

  stopImpersonation(userId: string, role: Role) {
    return this.settings.stopImpersonation(userId, role);
  }

  getEscalatedIssues(userId: string, role: Role, params?: any) {
    return this.settings.getEscalatedIssues(userId, role, params);
  }

  getSupportTickets(userId: string, role: Role, params?: any) {
    return this.settings.getSupportTickets(userId, role, params);
  }

  createSupportTicket(userId: string, role: Role, ticket: any) {
    return this.settings.createSupportTicket(userId, role, ticket);
  }

  updateSupportTicket(
    userId: string,
    role: Role,
    ticketId: string,
    patch: any,
  ) {
    return this.settings.updateSupportTicket(userId, role, ticketId, patch);
  }

  escalateTicket(userId: string, role: Role, ticketId: string, body: any) {
    return this.settings.escalateTicket(userId, role, ticketId, body);
  }

  getContactChannels(userId: string, role: Role) {
    return this.settings.getContactChannels(userId, role);
  }

  updateContactChannels(userId: string, role: Role, channels: any) {
    return this.settings.updateContactChannels(userId, role, channels);
  }

  getStudentAcademicHistory(userId: string, role: Role, studentId: string) {
    return this.settings.getStudentAcademicHistory(userId, role, studentId);
  }

  getActiveImpersonations(userId: string, role: Role) {
    return this.settings.getActiveImpersonations(userId, role);
  }

  createEscalation(userId: string, role: Role, body: any) {
    return this.settings.createEscalation(userId, role, body);
  }

  getPromotionRecommendations(userId: string, role: Role, params?: any) {
    return this.archive.getPromotionRecommendations(userId, role, params);
  }

  getComplianceCohortPerformance(userId: string, role: Role) {
    return this.compliance.getComplianceCohortPerformance(userId, role);
  }

  getComplianceTimeline(userId: string, role: Role) {
    return this.compliance.getComplianceTimeline(userId, role);
  }

  getPromotionMetrics(userId: string, role: Role) {
    return this.compliance.getPromotionMetrics(userId, role);
  }

  exportWAECCSV(termId: string, className: string, userId: string, role: Role) {
    return this.exportService.exportWAECCSV(termId, className, userId, role);
  }

  exportDepartmentWAECCSV(termId: string, userId: string, role: Role) {
    return this.exportService.exportDepartmentWAECCSV(termId, userId, role);
  }

  exportWAECPDF(termId: string, className: string, userId: string, role: Role) {
    return this.exportService.exportWAECPDF(termId, className, userId, role);
  }

  exportDepartmentWAECPDF(termId: string, userId: string, role: Role) {
    return this.exportService.exportDepartmentWAECPDF(termId, userId, role);
  }

  getGradeComparison(
    subjectId: string,
    termA: string,
    termB: string,
    userId: string,
    role: Role,
  ) {
    return this.grades.getGradeComparison(
      subjectId,
      termA,
      termB,
      userId,
      role,
    );
  }

  resolveAlert(alertId: string, userId: string, role: Role) {
    return this.archive.resolveAlert(alertId, userId, role);
  }

  addCounselingNote(alertId: string, text: string, userId: string, role: Role) {
    return this.archive.addCounselingNote(alertId, text, userId, role);
  }

  createAuditLog(
    userId: string,
    role: Role,
    data: { action: string; entity: string; entityId: string; payload?: any },
  ) {
    return this.teachers.createAuditLog(userId, role, data);
  }

  addAuditLogComment(
    userId: string,
    role: Role,
    logId: string,
    comment: string,
  ) {
    return this.teachers.addAuditLogComment(userId, role, logId, comment);
  }
}

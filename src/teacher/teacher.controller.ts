import {
  Controller,
  Get,
  Param,
  UseGuards,
  Post,
  Patch,
  Delete,
  Body,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TeacherService } from './teacher.service';
import { GradingService } from '../grading/grading.service';

@ApiTags('Teacher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teacher')
export class TeacherController {
  constructor(
    private teacherService: TeacherService,
    private gradingService: GradingService,
  ) {}

  @Get('classes/:teacherId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get classes assigned to a teacher' })
  getClasses(
    @Param('teacherId') teacherId: string,
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.getClasses(teacherId, user);
  }

  @Get('classes/:teacherId/analytics')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get teacher analytics dashboard data' })
  getAnalytics(
    @Param('teacherId') teacherId: string,
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.getAnalytics(teacherId, user);
  }

  @Get('settings/classes')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get classes for teacher settings' })
  getSettingsClasses(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.getSettingsClasses(user);
  }

  @Get('settings/preferences')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get notification preferences' })
  getNotificationPreferences() {
    return this.teacherService.getNotificationPreferences();
  }

  @Get('subject-config')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get subject configuration' })
  getSubjectConfig() {
    return this.teacherService.getSubjectConfig();
  }

  @Get('grading/status-meta')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get grading status metadata' })
  getGradingStatusMeta() {
    return this.teacherService.getGradingStatusMeta();
  }

  @Get('grading/filters')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get grading filter options' })
  getGradingFilterOptions() {
    return this.teacherService.getGradingFilterOptions();
  }

  @Get('observation-types')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get observation types' })
  getObservationTypes() {
    return this.teacherService.getObservationTypes();
  }

  @Get('observation-colors')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get observation colors' })
  getObservationColors() {
    return this.teacherService.getObservationColors();
  }

  @Get('analytics-observation-colors')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get analytics observation colors' })
  getAnalyticsObservationColors() {
    return this.teacherService.getAnalyticsObservationColors();
  }

  @Get('grade-config')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get grade configuration' })
  getGradeConfig() {
    return this.teacherService.getGradeConfig();
  }

  @Get('missing-observations')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get missing observations tray' })
  getMissingObservations(@CurrentUser() user: { id: string; role: Role }) {
    return this.teacherService.getMissingObservationsTray(user.id, user.role);
  }

  @Patch('profile')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Update teacher profile' })
  updateProfile(
    @Body()
    data: {
      name?: string;
      department?: string;
      email?: string;
      phone?: string;
    },
    @CurrentUser()
    user: { id: string; role: Role; staffProfile?: { id: string } },
  ) {
    return this.teacherService.updateProfile(user.id, data);
  }

  @Get('profile')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get current teacher profile' })
  getProfile(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.getProfile(user);
  }

  @Get('support/observations')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get support observations for a teacher' })
  getSupportObservations(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.getSupportObservations(user);
  }

  @Get('observations')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get observation logs for a teacher' })
  getObservations(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.gradingService.getObservationLogs(user.id, user.role);
  }

  @Get('grade-revisions')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get grade revision requests for the current teacher' })
  async getGradeRevisions(
    @Query('teacherId') teacherId: string,
    @CurrentUser()
    user: { id: string; role: Role; staffProfile?: { id: string } },
  ) {
    const targetTeacherId = teacherId || user.staffProfile?.id || user.id;
    return this.teacherService.getGradeRevisions(targetTeacherId);
  }

  @Get('grading/students')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Get students eligible for grading by subject and class names',
  })
  getStudentsForGrading(
    @Query('subject') subjectName: string,
    @Query('class') className: string,
    @CurrentUser()
    user: { id: string; role: Role; staffProfile?: { id: string } },
  ) {
    return this.teacherService.getGradingStudents(subjectName, className, user);
  }

  @Get('grading/ids')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Resolve subject, class, and term IDs by name' })
  getGradingIds(
    @Query('subject') subjectName: string,
    @Query('class') className: string,
  ) {
    return this.teacherService.getGradingIds(subjectName, className);
  }

  @Post('grade-revisions')
  @Roles(Role.TEACHER, Role.HOD)
  @ApiOperation({ summary: 'Submit a grade revision request' })
  submitGradeRevision(
    @Body()
    body: {
      gradeEntryId: string;
      issue: string;
      severity: string;
    },
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    console.error('[DEBUG] submitGradeRevision controller hit', { body, user });
    try {
      return this.teacherService.submitGradeRevision(body, {
        id: user.staffProfile?.id || user.id,
        role: user.role,
      });
    } catch (err) {
      console.error('[DEBUG] submitGradeRevision controller error', err);
      throw err;
    }
  }

  @Patch('grade-revisions/:revisionId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Update a grade revision request' })
  updateGradeRevision(
    @Param('revisionId') revisionId: string,
    @Body() body: { status?: string; history?: any },
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.updateGradeRevision(revisionId, body, {
      id: user.staffProfile?.id || user.id,
      role: user.role,
      staffProfile: user.staffProfile,
    });
  }

  @Get('observations')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get teacher observation audit logs' })
  getObservationLogs(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.gradingService.getObservationLogs(user.id, user.role);
  }

  @Post('observations')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Create or resolve a grade observation' })
  createObservation(
    @Body() body: any,
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.gradingService.createObservation(body, user.id, user.role);
  }

  @Patch('observations/:observationId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Update a grade observation' })
  updateObservation(
    @Param('observationId') observationId: string,
    @Body() body: any,
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.gradingService.updateObservation(
      observationId,
      body,
      user.id,
      user.role,
    );
  }

  @Delete('observations/:observationId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Clear a grade observation' })
  deleteObservation(
    @Param('observationId') observationId: string,
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.gradingService.deleteObservation(
      observationId,
      user.id,
      user.role,
    );
  }

  @Get('grade-issues')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get grade issues for a teacher' })
  getGradeIssues(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.getGradeIssues(user.staffProfile?.id || user.id);
  }

  @Get('grade-issues/meta')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get grade issue status metadata for a teacher' })
  getGradeIssueStatusMeta(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.getGradeIssueStatusMeta(
      user.staffProfile?.id || user.id,
    );
  }
}

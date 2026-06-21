import { Controller, Get, Param, UseGuards, Post, Patch, Delete, Body, Query } from '@nestjs/common';
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
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
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
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
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

  @Get('grade-revisions')
  @Roles(Role.TEACHER, Role.HOD)
  @ApiOperation({ summary: 'Get grade revision requests for a teacher' })
  getGradeRevisions(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      staffProfile?: { id: string };
    },
  ) {
    return this.teacherService.getGradeRevisions(user.staffProfile?.id || user.id);
  }

  @Get('grading/students')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get students eligible for grading by subject and class names' })
  getStudentsForGrading(
    @Query('subject') subjectName: string,
    @Query('class') className: string,
    @CurrentUser() user: { id: string; role: Role; staffProfile?: { id: string } },
  ) {
    return this.teacherService.getGradingStudents(subjectName, className, user);
  }

  @Get('grading/ids')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
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
    @Body() body: {
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
    return this.teacherService.submitGradeRevision(body, user.staffProfile?.id || user.id);
  }

  @Patch('grade-revisions/:revisionId')
  @Roles(Role.TEACHER, Role.HOD)
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
    return this.teacherService.updateGradeRevision(revisionId, body, user.staffProfile?.id || user.id);
  }

  @Get('observations')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
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
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
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
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
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
    return this.gradingService.updateObservation(observationId, body, user.id, user.role);
  }

  @Delete('observations/:observationId')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
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
    return this.gradingService.deleteObservation(observationId, user.id, user.role);
  }
}

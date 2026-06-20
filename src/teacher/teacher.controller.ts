import { Controller, Get, Param, UseGuards, Post, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TeacherService } from './teacher.service';

@ApiTags('Teacher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teacher')
export class TeacherController {
  constructor(private teacherService: TeacherService) {}

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
}

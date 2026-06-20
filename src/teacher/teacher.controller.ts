import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
}

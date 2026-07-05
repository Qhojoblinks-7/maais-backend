import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, DayOfWeek } from '@prisma/client';
import { TimetableService } from './timetable.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Timetable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timetable')
export class TimetableController {
  constructor(private timetableService: TimetableService) {}

  @Post()
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Create a timetable entry' })
  create(@Body() body: any) {
    return this.timetableService.create(body);
  }

  @Get()
  @Roles(Role.STUDENT, Role.TEACHER)
  @ApiOperation({ summary: 'Get all timetable entries with optional filters' })
  findAll(
    @Query('teacherId') teacherId?: string,
    @Query('teacher_id') teacherIdSnake?: string,
    @Query('classId') classId?: string,
    @Query('class_id') classIdSnake?: string,
    @Query('dayOfWeek') dayOfWeek?: DayOfWeek,
    @Query('track') track?: string,
  ) {
    return this.timetableService.findAll({
      teacherId: teacherId || teacherIdSnake,
      classId: classId || classIdSnake,
      dayOfWeek,
      track,
    });
  }

  @Get('my-schedule')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get current teacher weekly schedule' })
  getMySchedule(@CurrentUser() user: { staffProfile?: { id: string } }) {
    if (!user?.staffProfile?.id) return [];
    return this.timetableService.getWeeklySchedule(user.staffProfile.id);
  }

  @Get('teacher/:teacherId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get timetable for a specific teacher' })
  getByTeacher(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: { role: Role; staffProfile?: { id: string } },
  ) {
    if (user.role === Role.TEACHER && user.staffProfile?.id !== teacherId) {
      throw new ForbiddenException(
        'Teachers can only access their own timetable',
      );
    }
    return this.timetableService.findByTeacher(teacherId);
  }

  @Get('class/:classId')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get timetable for a specific class' })
  getByClass(
    @Param('classId') classId: string,
    @Query('track') track?: string,
  ) {
    return this.timetableService.findByClass(classId, track);
  }

  @Get('weekly/:teacherId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get weekly schedule grouped by day' })
  getWeekly(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: { role: Role; staffProfile?: { id: string } },
  ) {
    if (user.role === Role.TEACHER && user.staffProfile?.id !== teacherId) {
      throw new ForbiddenException(
        'Teachers can only access their own timetable',
      );
    }
    return this.timetableService.getWeeklySchedule(teacherId);
  }

  @Get('clashes/:teacherId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Detect scheduling clashes for a teacher' })
  getClashes(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: { role: Role; staffProfile?: { id: string } },
  ) {
    if (user.role === Role.TEACHER && user.staffProfile?.id !== teacherId) {
      throw new ForbiddenException(
        'Teachers can only access their own timetable',
      );
    }
    return this.timetableService.detectClashes(teacherId);
  }

  @Get(':id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get a timetable entry by ID' })
  findOne(@Param('id') id: string) {
    return this.timetableService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Update a timetable entry' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.timetableService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Delete a timetable entry' })
  delete(@Param('id') id: string) {
    return this.timetableService.delete(id);
  }

  @Post('broadcast')
  @Roles(Role.HOD)
  @ApiOperation({
    summary: 'Broadcast timetable to student and teacher portals',
  })
  broadcastToApps(@Body() body: { classIds?: string[]; track?: string }) {
    return this.timetableService.broadcastToApps(body.classIds, body.track);
  }

  @Post('finalize')
  @Roles(Role.HOD)
  @ApiOperation({
    summary: 'Finalize the timetable and lock into registrar records',
  })
  finalizeGrid(@Body() body: { classIds?: string[]; track?: string }) {
    return this.timetableService.finalizeGrid(body.classIds, body.track);
  }
}

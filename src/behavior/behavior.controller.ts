import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BehaviorService } from './behavior.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Behavior')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BehaviorController {
  constructor(private readonly behaviorService: BehaviorService) {}

  @Post(':id/behavior')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create behavior observation for a student' })
  createBahavior(
    @Param('id') studentId: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.behaviorService.createBehavior({
      ...body,
      studentId,
      teacherId: userId,
    });
  }

  @Get(':id/behavior')
  @Roles(
    Role.STUDENT,
    Role.TEACHER,
    Role.HOD,
    Role.HEADMASTER,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get behavior observations for a student' })
  getBehavior(
    @Param('id') studentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.behaviorService.getStudentBehavior(studentId, userId, role);
  }

  /* @Get(':id/traits')
  getTraits(
    @Param('id') studentId: string,
  ) {
    return this.behaviorService.getTraits(
      studentId,
    );
  } */
}

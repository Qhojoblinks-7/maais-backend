import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BehaviorService } from './behavior.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('Behavior')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BehaviorController {
  constructor(
    private readonly behaviorService: BehaviorService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':id/behavior')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Create behavior observation for a student' })
  async createBahavior(
    @Param('id') studentId: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    const staffProfile = await this.prisma.staffProfile.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!staffProfile) {
      throw new NotFoundException('Staff profile not found for current user');
    }

    return this.behaviorService.createBehavior({
      ...body,
      studentId,
      recordedById: staffProfile.id,
    });
  }

  @Get(':id/behavior')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get behavior observations for a student' })
  getBehavior(
    @Param('id') studentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.behaviorService.getStudentBehavior(studentId, userId, role);
  }

  @Post('behavior/batch')
  @Roles(Role.TEACHER, Role.HEADMASTER, Role.SUPER_ADMIN, Role.HOD)
  @ApiOperation({ summary: 'Get behavior observations for multiple students' })
  async getBehaviorBatch(
    @Body() body: { studentIds: string[] },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.behaviorService.getBehaviorBatch(body.studentIds);
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

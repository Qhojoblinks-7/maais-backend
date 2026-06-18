import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InterventionsService } from './interventions.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Interventions')
@ApiBearerAuth()
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterventionController {
  constructor(private readonly interventionService: InterventionsService) {}

  @Get(':id/interventions')
  @Roles(
    Role.STUDENT,
    Role.TEACHER,
    Role.HOD,
    Role.HEADMASTER,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get intervention alerts for a student' })
  getInterventions(
    @Param('id') studentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.interventionService.getStudentInterventions(
      studentId,
      userId,
      role,
    );
  }
}

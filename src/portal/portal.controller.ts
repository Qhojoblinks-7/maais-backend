import { Controller, Param, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PortalService } from './portal.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Portal')
@ApiBearerAuth()
@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('students/:id/portal-data')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get portal dashboard data for a student' })
  getPortalData(
    @Param('id') studentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.portalService.getPortalData(studentId, userId, role);
  }
}

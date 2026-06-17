import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ArchiveService } from './archive.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { PromotionDto } from '../comms/dto/comms.dto';

@ApiTags('Archive')
@ApiBearerAuth()
@Controller('archive')
export class ArchiveController {
  constructor(private archiveService: ArchiveService) {}

  @Post('promote')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Run annual promotion cycle' })
  runPromotion(@Body() dto: PromotionDto, @CurrentUser('id') userId: string) {
    return this.archiveService.runPromotionCycle(dto.academicYearId, userId);
  }

  @Get('vault/search')
  @Roles(Role.HEADMASTER, Role.SUPER_ADMIN, Role.HOD, Role.TEACHER)
  @ApiOperation({ summary: 'Search The Vault for historical records' })
  searchVault(@Query() query: any, @CurrentUser('id') userId: string, @CurrentUser('role') role: Role) {
    return this.archiveService.searchVault(query, userId, role);
  }

  @Patch('terms/:id/lock')
  @Roles(Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lock a term' })
  lockTerm(@Param('id') id: string) {
    return this.archiveService.lockTerm(id);
  }

  @Get('health')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER,Role.HOD, Role.TEACHER)
  @ApiOperation({ summary: 'Database health check' })
  health() {
    return this.archiveService.getDatabaseHealth();
  }
}
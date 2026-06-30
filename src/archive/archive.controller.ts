import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, ClassLevel } from '@prisma/client';
import { ArchiveService } from './archive.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { PromotionDto, TransferStudentsDto } from '../comms/dto/comms.dto';

@ApiTags('Archive')
@ApiBearerAuth()
@Controller('archive')
export class ArchiveController {
  constructor(private archiveService: ArchiveService) {}

  @Post('promote')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Run annual promotion cycle' })
  runPromotion(@Body() dto: PromotionDto, @CurrentUser('id') userId: string) {
    return this.archiveService.runPromotionCycle(
      dto.academicYearId,
      userId,
      dto.studentId,
      dto.classId,
      dto.classLevel,
    );
  }

  @Get('vault/search')
  @Roles(Role.HEADMASTER, Role.SUPER_ADMIN, Role.HOD, Role.TEACHER)
  @ApiOperation({ summary: 'Search The Vault for historical records' })
  searchVault(
    @Query() query: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.archiveService.searchVault(query, userId, role);
  }

  @Patch('terms/:id/lock')
  @Roles(Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lock a term' })
  lockTerm(@Param('id') id: string) {
    return this.archiveService.lockTerm(id);
  }

  @Get('stats')
  @Roles(Role.HEADMASTER, Role.SUPER_ADMIN, Role.HOD, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get archive statistics and recent promotions' })
  getStats() {
    return this.archiveService.getArchiveStats();
  }

  @Get('health')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Database health check' })
  health() {
    return this.archiveService.getDatabaseHealth();
  }

  @Post('years/:yearId/archive')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Archive all students of a year group/level' })
  archiveYearGroup(
    @Param('yearId') yearId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.archiveService.archiveYearGroup(yearId, userId);
  }

  @Post('classes/transfer')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Transfer students between classes' })
  transferStudents(
    @Body() dto: TransferStudentsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.archiveService.transferStudents(
      dto.sourceClassId,
      dto.targetClassId,
      dto.studentIds,
    );
  }

  @Patch('classes/:id/capacity')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Update class capacity' })
  updateClassCapacity(
    @Param('id') id: string,
    @Body('capacity') capacity: number,
  ) {
    return this.archiveService.updateClassCapacity(id, capacity);
  }

  @Post('classes/:id/rebalance')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Rebalance house distribution for a class' })
  rebalanceHouses(@Param('id') id: string) {
    return this.archiveService.rebalanceHouses(id);
  }
}

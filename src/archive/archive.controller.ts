import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
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
  @Roles(Role.HOD)
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
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Search The Vault for historical records' })
  searchVault(
    @Query() query: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.archiveService.searchVault(query, userId, role);
  }

  @Get('students/:id/promotions')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get promotion history for a student' })
  getPromotionHistory(@Param('id') studentId: string) {
    return this.archiveService.getPromotionHistory(studentId);
  }

  @Get('class-benchmarks')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Get per-term class benchmark averages (ghost markers)',
  })
  getClassBenchmarks(@Query('classId') classId: string) {
    return this.archiveService.getClassBenchmarks(classId);
  }

  @Patch('terms/:id/lock')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Lock a term' })
  lockTerm(@Param('id') id: string) {
    return this.archiveService.lockTerm(id);
  }

  @Get('terms/unlocked')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Get unlocked terms for an academic year' })
  getUnlockedTerms(@Query('academicYearId') academicYearId: string) {
    return this.archiveService.getUnlockedTerms(academicYearId);
  }

  @Post('terms/lock-all')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Bulk-lock all terms for an academic year' })
  lockAllTerms(@Body('academicYearId') academicYearId: string) {
    return this.archiveService.lockAllTerms(academicYearId);
  }

  @Get('stats')
  @Roles(Role.TEACHER, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get archive statistics and recent promotions' })
  getStats(
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.archiveService.getArchiveStats(academicYearId, termId);
  }

  @Get('health')
  @Roles(Role.TEACHER, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Database health check' })
  health() {
    return this.archiveService.getDatabaseHealth();
  }

  @Post('years/:yearId/archive')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Archive all students of a year group/level' })
  archiveYearGroup(
    @Param('yearId') yearId: string,
    @Body('level') level: ClassLevel,
    @CurrentUser('id') userId: string,
  ) {
    return this.archiveService.archiveYearGroup(yearId, level, userId);
  }

  @Post('classes/transfer')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Transfer students between classes' })
  transferStudents(@Body() dto: TransferStudentsDto) {
    return this.archiveService.transferStudents(
      dto.sourceClassId,
      dto.targetClassId,
      dto.studentIds,
    );
  }

  @Patch('classes/:id/capacity')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Update class capacity' })
  updateClassCapacity(
    @Param('id') id: string,
    @Body('capacity') capacity: number,
  ) {
    return this.archiveService.updateClassCapacity(id, capacity);
  }

  @Post('classes/:id/rebalance')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Rebalance house distribution for a class' })
  rebalanceHouses(@Param('id') id: string) {
    return this.archiveService.rebalanceHouses(id);
  }
}

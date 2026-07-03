import { Controller, Post, Param, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WAEExportService } from './wae-export.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('WAE Export')
@ApiBearerAuth()
@Controller('wae')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WAEExportController {
  constructor(private readonly waeService: WAEExportService) {}

  @Get('preview/:termId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Preview WAEC STP CSV data with validation' })
  async previewCSV(
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('className') className?: string,
  ) {
    return this.waeService.previewCSV(termId, userId, role, className);
  }

  @Post('prepare/:termId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Prepare WAEC STP CSV files for manual upload' })
  async prepareForWAEP(
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.waeService.prepareForWAEP(termId, userId, role);
  }
}

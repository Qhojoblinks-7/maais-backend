import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Global search across students, staff, parents, departments and classes' })
  globalSearch(
    @CurrentUser() user: { id: string; role: Role },
    @Query('q') q?: string,
  ) {
    return this.searchService.globalSearch(user, q || '');
  }
}

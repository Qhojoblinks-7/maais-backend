import { Controller, Param, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PortalService } from './portal.service'
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Portal')
@ApiBearerAuth()
@Controller('portal')
export class PortalController {

    constructor(private readonly portalService: PortalService,) {}

    @Get('students/:id/portal-data')
    getPortalData(
        @Param('id') studentId: string,
    ) {
        console.log('[PortalController] getPortalData called with studentId param:', studentId);
        return this.portalService.getPortalData(
            studentId,
        )
    }

    @Get('search')
    @Roles(Role.TEACHER, Role.HOD, Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Search students for quick lookup' })
    searchStudents(
        @Query('q') query: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('role') role: Role
    ) {
        return this.portalService.searchStudents(query, role, userId);
    }
}
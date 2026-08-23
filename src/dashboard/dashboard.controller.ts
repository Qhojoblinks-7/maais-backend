import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  @Get('summary')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.ASSISTANT_HEAD_ADMINISTRATION, Role.ASSISTANT_HEAD_DOMESTIC)
  @ApiOperation({ summary: 'Get admin dashboard summary data in a single request' })
  @ApiResponse({ status: 200, description: 'Dashboard summary data' })
  async getSummary(@CurrentUser('id') userId: string) {
    const cacheKey = 'dashboard:summary';
    const cached = await this.cacheService.getCachedAggregate<any>(cacheKey, userId);
    if (cached) return cached;

    const [
      studentCount,
      staffCount,
      unreadNotifications,
      tickets,
      activeYear,
      academicYears,
      departments,
      subjects,
      systemFreeze,
    ] = await Promise.all([
      this.prisma.studentProfile.count(),
      this.prisma.staffProfile.count(),
      this.prisma.notification.count({ where: { isRead: false } }),
      this.prisma.supportTicket.count({ where: { status: { not: 'RESOLVED' } } }),
      this.prisma.academicYear.findFirst({ where: { isActive: true }, include: { terms: true } }),
      this.prisma.academicYear.findMany({ include: { terms: true } }),
      this.prisma.department.findMany({ select: { id: true, name: true, code: true } }),
      this.prisma.subject.findMany({ select: { id: true, name: true, code: true } }),
      this.prisma.adminSettings.findFirst(),
    ]);

    const result = {
      studentCount,
      staffCount,
      unreadNotifications,
      tickets,
      activeYear,
      academicYears,
      departments,
      subjects,
      systemFreeze: systemFreeze
        ? { isFrozen: systemFreeze.systemFrozen, reason: systemFreeze.systemFreezeReason }
        : { isFrozen: false, reason: null },
    };

    await this.cacheService.setCachedAggregate(cacheKey, userId, result, 60);

    return result;
  }
}

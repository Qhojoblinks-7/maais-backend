import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './common/prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Public health check — returns server status and warms DB connection' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString(), db: 'connected' };
    } catch {
      return { status: 'degraded', timestamp: new Date().toISOString(), db: 'unavailable' };
    }
  }

  @Get('keep-alive')
  @Public()
  @ApiOperation({ summary: 'Keep-alive ping for external monitors (e.g. UptimeRobot)' })
  async keepAlive() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'alive', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'alive', timestamp: new Date().toISOString(), db: 'degraded' };
    }
  }
}

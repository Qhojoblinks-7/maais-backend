import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class HealthController {
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Public health check — returns server status' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

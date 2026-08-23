import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarmupService {
  private readonly logger = new Logger(WarmupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('*/5 * * * *', {
    name: 'db-warmup',
    timeZone: 'UTC',
  })
  async warmupDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.warn('Database warmup failed', error.message);
    }
  }
}

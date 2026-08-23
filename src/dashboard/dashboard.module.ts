import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [DashboardController],
})
export class DashboardModule {}

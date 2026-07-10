import { Module } from '@nestjs/common';
import { GradingService } from './grading.service';
import { GradingController } from './grading.controller';
import { InterventionsModule } from '../interventions/interventions.module';
import { OCCService } from '../common/services/occ.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [InterventionsModule, CacheModule],
  providers: [GradingService, OCCService],
  controllers: [GradingController],
  exports: [GradingService],
})
export class GradingModule {}

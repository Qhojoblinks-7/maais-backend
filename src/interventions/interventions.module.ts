import { Module } from '@nestjs/common';
import { InterventionController } from './interventions.controller';
import { InterventionsService } from './interventions.service';
import { InterventionSchedulerService } from './intervention-scheduler.service';

@Module({
  controllers: [InterventionController],
  providers: [InterventionsService, InterventionSchedulerService],
  exports: [InterventionsService],
})
export class InterventionsModule {}

import { Module } from '@nestjs/common';
import { CommsService } from './comms.service';
import { CommsController } from './comms.controller';
import { CircuitBreakerService } from '../common/services/circuit-breaker.service';

@Module({
  providers: [CommsService, CircuitBreakerService],
  controllers: [CommsController],
  exports: [CommsService],
})
export class CommsModule {}

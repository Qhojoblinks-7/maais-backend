import { Module } from '@nestjs/common';
import { WAEExportController } from './wae-export.controller';
import { WAEExportService } from './wae-export.service';
import { WAECValidationService } from './waec-validation.service';
import { HODModule } from '../hod/hod.module';

@Module({
  imports: [HODModule],
  controllers: [WAEExportController],
  providers: [WAEExportService, WAECValidationService],
  exports: [WAECValidationService],
})
export class WAEExportModule {}

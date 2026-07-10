import { Module } from '@nestjs/common';
import { HODService } from './hod.service';
import { HODContextService } from './hod-context.service';
import { HODGradeService } from './hod-grades.service';
import { HODTeacherService } from './hod-teachers.service';
import { HODArchiveService } from './hod-archive.service';
import { HODComplianceService } from './hod-compliance.service';
import { HODExportService } from './hod-export.service';
import { WAEExportService } from './wae-export.service';
import { WAECValidationService } from './waec-validation.service';
import { WAEExportController } from './wae-export.controller';
import { HODSettingsService } from './hod-settings.service';
import { HODController } from './hod.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { OCCService } from '../common/services/occ.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [HODController, WAEExportController],
  providers: [
    HODService,
    HODContextService,
    HODGradeService,
    HODTeacherService,
    HODArchiveService,
    HODComplianceService,
    HODExportService,
    WAEExportService,
    WAECValidationService,
    HODSettingsService,
    OCCService,
  ],
  exports: [HODService],
})
export class HODModule {}

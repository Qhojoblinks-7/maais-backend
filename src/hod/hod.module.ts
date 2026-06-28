import { Module } from '@nestjs/common';
import { HODService } from './hod.service';
import { HODContextService } from './hod-context.service';
import { HODGradeService } from './hod-grades.service';
import { HODTeacherService } from './hod-teachers.service';
import { HODArchiveService } from './hod-archive.service';
import { HODComplianceService } from './hod-compliance.service';
import { HODExportService } from './hod-export.service';
import { HODSettingsService } from './hod-settings.service';
import { HODController } from './hod.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HODController],
  providers: [
    HODService,
    HODContextService,
    HODGradeService,
    HODTeacherService,
    HODArchiveService,
    HODComplianceService,
    HODExportService,
    HODSettingsService,
  ],
  exports: [HODService],
})
export class HODModule {}

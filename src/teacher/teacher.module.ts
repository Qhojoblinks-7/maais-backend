import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { GradingModule } from '../grading/grading.module';
import { OCCService } from '../common/services/occ.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [GradingModule, CacheModule],
  controllers: [TeacherController],
  providers: [TeacherService, OCCService],
})
export class TeacherModule {}

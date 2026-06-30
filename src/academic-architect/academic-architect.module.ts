import { Module } from '@nestjs/common';
import { AcademicArchitectService } from './academic-architect.service';
import { AcademicArchitectController } from './academic-architect.controller';
import { CurriculumModule } from './curriculum/curriculum.module';
import { ClassesModule } from './classes/classes.module';

@Module({
  imports: [CurriculumModule, ClassesModule],
  providers: [AcademicArchitectService],
  controllers: [AcademicArchitectController],
  exports: [AcademicArchitectService],
})
export class AcademicArchitectModule {}

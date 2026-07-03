import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AcademicArchitectModule } from './academic-architect/academic-architect.module';
import { GradingModule } from './grading/grading.module';
import { ReportsModule } from './reports/reports.module';
import { ArchiveModule } from './archive/archive.module';
import { CommsModule } from './comms/comms.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SystemFreezeGuard } from './common/guards/system-freeze.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PortalModule } from './portal/portal.module';
import { AdminModule } from './admin/admin.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { BehaviorModule } from './behavior/behavior.module';
import { InterventionsModule } from './interventions/interventions.module';
import { MedicalModule } from './medical/medical.module';
import { TimetableModule } from './timetable/timetable.module';
import { TeacherModule } from './teacher/teacher.module';
import { HODModule } from './hod/hod.module';
import { DatabaseInitService } from './common/services/database-init.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    AcademicArchitectModule,
    GradingModule,
    ReportsModule,
    ArchiveModule,
    CommsModule,
    PortalModule,
    AdminModule,
    ApprovalsModule,
    BehaviorModule,
    InterventionsModule,
    MedicalModule,
    TimetableModule,
    TeacherModule,
    HODModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SystemFreezeGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    DatabaseInitService,
  ],
  controllers: [HealthController],
})
export class AppModule {}

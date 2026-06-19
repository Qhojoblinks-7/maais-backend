"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const prisma_module_1 = require("./common/prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const academic_architect_module_1 = require("./academic-architect/academic-architect.module");
const grading_module_1 = require("./grading/grading.module");
const reports_module_1 = require("./reports/reports.module");
const archive_module_1 = require("./archive/archive.module");
const comms_module_1 = require("./comms/comms.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const portal_module_1 = require("./portal/portal.module");
const behavior_module_1 = require("./behavior/behavior.module");
const interventions_module_1 = require("./interventions/interventions.module");
const timetable_module_1 = require("./timetable/timetable.module");
const teacher_module_1 = require("./teacher/teacher.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            academic_architect_module_1.AcademicArchitectModule,
            grading_module_1.GradingModule,
            reports_module_1.ReportsModule,
            archive_module_1.ArchiveModule,
            comms_module_1.CommsModule,
            portal_module_1.PortalModule,
            behavior_module_1.BehaviorModule,
            interventions_module_1.InterventionsModule,
            timetable_module_1.TimetableModule,
            teacher_module_1.TeacherModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
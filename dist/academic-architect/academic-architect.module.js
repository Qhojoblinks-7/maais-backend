"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicArchitectModule = void 0;
const common_1 = require("@nestjs/common");
const academic_architect_service_1 = require("./academic-architect.service");
const academic_architect_controller_1 = require("./academic-architect.controller");
const curriculum_module_1 = require("./curriculum/curriculum.module");
const classes_module_1 = require("./classes/classes.module");
let AcademicArchitectModule = class AcademicArchitectModule {
};
exports.AcademicArchitectModule = AcademicArchitectModule;
exports.AcademicArchitectModule = AcademicArchitectModule = __decorate([
    (0, common_1.Module)({
        imports: [curriculum_module_1.CurriculumModule, classes_module_1.ClassesModule],
        providers: [academic_architect_service_1.AcademicArchitectService],
        controllers: [academic_architect_controller_1.AcademicArchitectController],
        exports: [academic_architect_service_1.AcademicArchitectService],
    })
], AcademicArchitectModule);
//# sourceMappingURL=academic-architect.module.js.map
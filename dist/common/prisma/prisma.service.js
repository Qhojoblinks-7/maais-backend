"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_neon_1 = require("@prisma/adapter-neon");
const serverless_1 = require("@neondatabase/serverless");
const ws_1 = __importDefault(require("ws"));
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
let PrismaService = class PrismaService extends client_1.PrismaClient {
    constructor() {
        const adapter = new adapter_neon_1.PrismaNeon({
            connectionString: process.env.DATABASE_URL,
        });
        super({
            adapter,
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['warn', 'error'],
        });
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('cleanDatabase() cannot be called in production!');
        }
        const tables = [
            'audit_logs',
            'grade_corrections',
            'grade_entries',
            'attendance_records',
            'promotion_records',
            'report_cards',
            'transcripts',
            'notifications',
            'refresh_tokens',
            'teaching_assignments',
            'student_parent_links',
            'student_profiles',
            'parent_profiles',
            'staff_profiles',
            'users',
        ];
        for (const t of tables) {
            await this.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`);
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map
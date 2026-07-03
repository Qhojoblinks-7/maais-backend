"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../common/prisma/prisma.service");
const argon2 = __importStar(require("argon2"));
const uuid_1 = require("uuid");
let AuthService = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive)
            return null;
        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid)
            return null;
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        return user;
    }
    async login(user) {
        const [accessToken, refreshToken] = await Promise.all([
            this.signAccessToken(user.id, user.email, user.role),
            this.createRefreshToken(user.id),
        ]);
        return {
            accessToken,
            refreshToken,
            userId: user.id,
            user: await this.sanitizeUser(user),
        };
    }
    async refreshTokens(userId, token) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token },
        });
        if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
            throw new common_1.ForbiddenException('Refresh token invalid or expired');
        }
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        return this.login(user);
    }
    async logout(userId, token) {
        await this.prisma.refreshToken.deleteMany({ where: { userId, token } });
        return { success: true };
    }
    async signAccessToken(id, email, role) {
        return this.jwt.signAsync({ sub: id, email, role }, {
            secret: this.config.get('JWT_ACCESS_SECRET'),
            expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        });
    }
    async createRefreshToken(userId) {
        const token = (0, uuid_1.v4)();
        const days = 7;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({
            data: { token, userId, expiresAt },
        });
        return token;
    }
    async sanitizeUser(user) {
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
                studentProfile: {
                    select: {
                        id: true,
                        indexNumber: true,
                        firstName: true,
                        lastName: true,
                        middleName: true,
                        gender: true,
                        dateOfBirth: true,
                        photoUrl: true,
                        admissionDate: true,
                        currentClassId: true,
                        departmentId: true,
                    },
                },
                staffProfile: {
                    select: {
                        id: true,
                        staffId: true,
                        firstName: true,
                        lastName: true,
                        middleName: true,
                        gender: true,
                        dateOfBirth: true,
                        photoUrl: true,
                        departmentId: true,
                    },
                },
                parentProfile: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                        occupation: true,
                    },
                },
            },
        });
        const { passwordHash: _, ...userDto } = fullUser;
        return userDto;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
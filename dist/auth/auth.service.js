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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../common/prisma/prisma.service");
const argon2 = require("argon2");
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
        const sanitized = this.sanitizeUser(user);
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
                studentProfile: { select: { id: true } },
                staffProfile: { select: { id: true } },
            },
        });
        const profileId = fullUser?.studentProfile?.id || fullUser?.staffProfile?.id || null;
        return { accessToken, refreshToken, user: { ...sanitized, profileId } };
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
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                email: true,
                role: true,
                studentProfile: { select: { firstName: true, lastName: true } },
                staffProfile: { select: { firstName: true, lastName: true } },
            },
        });
        const name = (user?.studentProfile ? `${user.studentProfile.firstName} ${user.studentProfile.lastName}` : '') ||
            (user?.staffProfile ? `${user.staffProfile.firstName} ${user.staffProfile.lastName}` : '');
        return this.jwt.signAsync({ sub: id, id: id, email, role, name }, {
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
    sanitizeUser(user) {
        const userDto = { ...user };
        delete userDto.passwordHash;
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
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const refresh_dto_1 = require("./dto/refresh.dto");
const login_dto_1 = require("./dto/login.dto");
const prisma_service_1 = require("../common/prisma/prisma.service");
let AuthController = class AuthController {
    constructor(authService, prisma) {
        this.authService = authService;
        this.prisma = prisma;
    }
    async login(dto) {
        const user = await this.authService.validateUser(dto.email, dto.password);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return this.authService.login(user);
    }
    async refresh(dto) {
        return this.authService.refreshTokens(dto.userId, dto.refreshToken);
    }
    async logout(user, token) {
        return this.authService.logout(user.id, token);
    }
    async getMe(user) {
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
                        archivedAt: true,
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
        const { passwordHash: _, ...fullRest } = fullUser;
        return fullRest;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login with email and password' }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token using refresh token' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Logout and invalidate refresh token' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current authenticated user with profile' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
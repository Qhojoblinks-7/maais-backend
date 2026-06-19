import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { User } from '@prisma/client';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    validateUser(email: string, password: string): Promise<User | null>;
    login(user: User): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
        user: any;
    }>;
    refreshTokens(userId: string, token: string): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
        user: any;
    }>;
    logout(userId: string, token: string): Promise<{
        success: boolean;
    }>;
    private signAccessToken;
    private createRefreshToken;
    private sanitizeUser;
}

import { AuthService } from './auth.service';
import { RefreshDto } from './dto/refresh.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
export declare class AuthController {
    private authService;
    private prisma;
    constructor(authService: AuthService, prisma: PrismaService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
        user: any;
    }>;
    refresh(dto: RefreshDto): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
        user: any;
    }>;
    logout(user: User, token: string): Promise<{
        success: boolean;
    }>;
    changePassword(user: User, dto: ChangePasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getMe(user: User): Promise<any>;
}

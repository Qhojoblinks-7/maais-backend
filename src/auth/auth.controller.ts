import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RefreshDto } from './dto/refresh.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.userId, dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser() user: User, @Body('refreshToken') token: string) {
    return this.authService.logout(user.id, token);
  }
  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the current user password (all roles)' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user with profile' })
  async getMe(@CurrentUser() user: User) {
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

    const { passwordHash, ...fullRest } = fullUser as any;
    void passwordHash;
    return fullRest;
  }
}

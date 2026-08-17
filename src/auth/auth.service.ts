import { Injectable, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  async login(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user.id, user.email, user.role),
      this.createRefreshToken(user.id),
    ]);

    const { passwordHash, ...userDto } = user as any;
    void passwordHash;

    return {
      accessToken,
      refreshToken,
      userId: user.id,
      user: userDto,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');

    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new ForbiddenException(
        'New password must be at least 8 characters long',
      );
    }

    const sameAsOld = await argon2.verify(user.passwordHash, newPassword);
    if (sameAsOld) {
      throw new ForbiddenException(
        'New password must be different from the current password',
      );
    }

    const newHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    // Invalidate other sessions after a password change.
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { success: true, message: 'Password changed successfully' };
  }

  async refreshTokens(userId: string, token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token invalid or expired');
    }

    // Rotate: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return this.login(user);
  }

  async logout(userId: string, token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId, token } });
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return { success: true, message: 'If an account exists, a reset link has been sent.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expiresAt,
      },
    });

    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;

    try {
      await this.emailService.sendMail(
        email,
        'MAAIS Password Reset',
        `<p>Click the link below to reset your password. This link expires in 1 hour.</p>
         <p><a href="${resetUrl}">${resetUrl}</a></p>`,
      );
    } catch (e) {
      console.error('Password reset email failed:', e);
    }

    return { success: true, message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid or expired reset token');
    }

    const newHash = await argon2.hash(password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { success: true, message: 'Password reset successful' };
  }

  private async signAccessToken(id: string, email: string, role: string) {
    return this.jwt.signAsync(
      { sub: id, email, role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
  }

  private async createRefreshToken(userId: string) {
    const token = uuidv4();
    const days = 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }
}

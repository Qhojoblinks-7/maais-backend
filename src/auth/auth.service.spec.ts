import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    phone: null,
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$hash',
    role: Role.TEACHER,
    isActive: true,
    lastLoginAt: null,
    mustChangePassword: false,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    const mockV4 = uuidv4 as jest.Mock;
    mockV4.mockReturnValue('refresh-token-uuid');

    const mockVerify = (argon2 as any).verify as jest.Mock;
    mockVerify.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('returns null when user not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('returns null when user is inactive', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('returns null for wrong password', async () => {
      const mockVerify = (argon2 as any).verify as jest.Mock;
      mockVerify.mockResolvedValue(false);
      prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'wrong');

      expect(result).toBeNull();
    });

    it('returns user on successful validation', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'correct');

      expect(result).toEqual(mockUser);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('login', () => {
    it('returns tokens and user data', async () => {
      jwtService.signAsync = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token-uuid');
      prisma.refreshToken.create = jest.fn().mockResolvedValue({
        id: 'rt-1',
        token: 'refresh-token-uuid',
      });
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        phone: null,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$hash',
        role: Role.TEACHER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        studentProfile: null,
        staffProfile: null,
        parentProfile: null,
      });

      const result = await service.login(mockUser);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token-uuid');
      expect(result.userId).toBe('user-1');
    });
  });

  describe('refreshTokens', () => {
    it('throws for invalid refresh token', async () => {
      prisma.refreshToken.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.refreshTokens('user-1', 'invalid-token'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws for expired refresh token', async () => {
      prisma.refreshToken.findUnique = jest.fn().mockResolvedValue({
        id: 'rt-1',
        token: 'valid-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.refreshTokens('user-1', 'valid-token'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rotates refresh token and returns new tokens', async () => {
      prisma.refreshToken.findUnique = jest.fn().mockResolvedValue({
        id: 'rt-1',
        token: 'valid-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 100000),
      });
      prisma.refreshToken.delete = jest.fn().mockResolvedValue({ id: 'rt-1' });
      jwtService.signAsync = jest
        .fn()
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token-uuid');
      prisma.refreshToken.create = jest.fn().mockResolvedValue({});
      prisma.user.findUniqueOrThrow = jest.fn().mockResolvedValue(mockUser);
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        phone: null,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$hash',
        role: Role.TEACHER,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        studentProfile: null,
        staffProfile: null,
        parentProfile: null,
      });

      const result = await service.refreshTokens('user-1', 'valid-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
    });
  });

  describe('logout', () => {
    it('deletes refresh token', async () => {
      prisma.refreshToken.deleteMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const result = await service.logout('user-1', 'token-1');

      expect(result.success).toBe(true);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'token-1' },
      });
    });
  });
});

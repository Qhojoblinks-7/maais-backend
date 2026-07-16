import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const cacheKey = `jwt:user:${payload.sub}`;
    const cached = await this.cacheService.get<{
      id: string;
      email: string;
      role: string;
      isActive: boolean;
      staffProfile?: { id: string; departmentId?: string };
      studentProfile?: { id: string };
      parentProfile?: { id: string };
    }>(cacheKey);

    if (cached) {
      if (!cached.isActive) {
        throw new UnauthorizedException('User not found or deactivated');
      }
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        staffProfile: {
          select: {
            id: true,
            departmentId: true,
          },
        },
        studentProfile: {
          select: {
            id: true,
          },
        },
        parentProfile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    await this.cacheService.set(cacheKey, user, 300);
    return user;
  }
}

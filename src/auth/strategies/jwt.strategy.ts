import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }
    return user;
  }
}

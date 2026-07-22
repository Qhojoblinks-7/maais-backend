import { Controller, Post, Body, ConflictException } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Controller('bootstrap')
export class BootstrapController {
  constructor(private prisma: PrismaService) {}

  @Post('admin')
  async createFirstAdmin(@Body() dto: { email: string; password: string; firstName: string; lastName: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });
    if (existing) {
      throw new ConflictException('Super admin already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const admin = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: Role.SUPER_ADMIN,
        mustChangePassword: true,
        staffProfile: {
          create: {
            staffId: 'STA-2024-001',
            firstName: dto.firstName,
            lastName: dto.lastName,
            gender: 'MALE',
          },
        },
      },
      include: { staffProfile: true },
    });

    return { message: 'Super admin created', userId: admin.id };
  }
}

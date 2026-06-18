import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class BehaviorService {
  constructor(private prisma: PrismaService) {}

  async createBehavior(data: any) {
    return this.prisma.studentBehavior.create({
      data,
    });
  }

  async createTrait(data: any) {
    return this.prisma.characterTrait.create({
      data,
    });
  }

  async getStudentBehavior(
    studentId: string,
    requesterId?: string,
    requesterRole?: Role,
  ) {
    let targetStudentId = studentId;

    if (requesterRole === Role.STUDENT && requesterId) {
      const lookupStudent = await this.prisma.studentProfile.findUnique({
        where: { userId: requesterId },
        select: { id: true },
      });

      if (!lookupStudent) {
        throw new ForbiddenException('Student profile not found');
      }
      targetStudentId = lookupStudent.id;
    }

    const logs = await this.prisma.studentBehavior.findMany({
      where: { studentId: targetStudentId },
      orderBy: { createdAt: 'desc' },
    });

    const traits = await this.prisma.characterTrait.findFirst({
      where: { studentId: targetStudentId },
      orderBy: { createdAt: 'desc' },
    });

    return { logs, traits };
  }
}

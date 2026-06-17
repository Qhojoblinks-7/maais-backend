import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class BehaviorService {
    constructor(private prisma: PrismaService) {}

    async createBehavior(data:any) {
        return this.prisma.studentBehavior.create({
            data,
        });
    }

    async createTrait(data:any) {
        return this.prisma.characterTrait.create({
            data,
        });
    }

    async getStudentBehavior(studentId: string, requesterId?: string, requesterRole?: Role) {
        if (requesterRole === Role.STUDENT && requesterId) {
            const student = await this.prisma.studentProfile.findUnique({
                where: { id: studentId },
                select: { userId: true },
            });

            if (!student || student.userId !== requesterId) {
                throw new ForbiddenException('You can only view your own behavior records');
            }
        }

        const logs = await this.prisma.studentBehavior.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
        });

        const traits = await this.prisma.characterTrait.findFirst({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
        });

        return { logs, traits };
    }
}

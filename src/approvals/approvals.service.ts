import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { status?: string; search?: string }) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { teacherName: { contains: query.search, mode: 'insensitive' } },
        { detail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.approvalRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      take: 100,
    });
  }

  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.approvalRequest.count(),
      this.prisma.approvalRequest.count({ where: { status: 'pending' } }),
      this.prisma.approvalRequest.count({ where: { status: 'approved' } }),
      this.prisma.approvalRequest.count({ where: { status: 'rejected' } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActions = await this.prisma.approvalRequest.count({
      where: {
        resolvedAt: { gte: today },
      },
    });

    return { total, pending, approved, rejected, todayActions };
  }

  async create(
    dto: {
      teacherId: string;
      detail: string;
      priority?: string;
      category?: string;
      documentUrl?: string;
    },
    requesterId: string,
  ) {
    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: dto.teacherId },
      select: { firstName: true, lastName: true },
    });

    const teacherName = staff
      ? `${staff.firstName} ${staff.lastName}`
      : dto.teacherId;

    return this.prisma.approvalRequest.create({
      data: {
        teacherId: dto.teacherId,
        teacherName,
        detail: dto.detail,
        priority: dto.priority || 'normal',
        category: dto.category || 'other',
        documentUrl: dto.documentUrl,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.approvalRequest.findUniqueOrThrow({
      where: { id },
    });
  }

  async resolve(
    id: string,
    dto: { status: string; resolutionNotes?: string },
    resolvedById: string,
  ) {
    const existing = await this.prisma.approvalRequest.findUniqueOrThrow({
      where: { id },
    });

    if (existing.status !== 'pending') {
      throw new ForbiddenException('This approval has already been resolved');
    }

    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNotes: dto.resolutionNotes,
        resolvedAt: new Date(),
        resolvedById,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.approvalRequest.delete({
      where: { id },
    });
  }
}

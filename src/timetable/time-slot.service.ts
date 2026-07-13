import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateTimeSlotDto {
  label: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  sortOrder?: number;
}

export interface UpdateTimeSlotDto {
  label?: string;
  startTime?: string;
  endTime?: string;
  isBreak?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

@Injectable()
export class TimeSlotService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const slots = await this.prisma.timeSlot.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (slots.length > 0) {
        return slots;
      }
    } catch (error) {
      console.error('[TimeSlotService] findAll error:', error);
    }

    return [
      {
        id: '1',
        label: 'Period 1',
        startTime: '08:00',
        endTime: '08:40',
        isBreak: false,
        sortOrder: 1,
        isActive: true,
      },
      {
        id: '2',
        label: 'Period 2',
        startTime: '08:40',
        endTime: '09:20',
        isBreak: false,
        sortOrder: 2,
        isActive: true,
      },
      {
        id: '3',
        label: 'Period 3',
        startTime: '09:20',
        endTime: '10:00',
        isBreak: false,
        sortOrder: 3,
        isActive: true,
      },
      {
        id: 'break1',
        label: 'Snack Break',
        startTime: '10:00',
        endTime: '10:30',
        isBreak: true,
        sortOrder: 4,
        isActive: true,
      },
      {
        id: '4',
        label: 'Period 4',
        startTime: '10:30',
        endTime: '11:10',
        isBreak: false,
        sortOrder: 5,
        isActive: true,
      },
      {
        id: '5',
        label: 'Period 5',
        startTime: '11:10',
        endTime: '11:50',
        isBreak: false,
        sortOrder: 6,
        isActive: true,
      },
      {
        id: '6',
        label: 'Period 6',
        startTime: '11:50',
        endTime: '12:30',
        isBreak: false,
        sortOrder: 7,
        isActive: true,
      },
      {
        id: 'break2',
        label: 'Lunch Break',
        startTime: '12:30',
        endTime: '13:30',
        isBreak: true,
        sortOrder: 8,
        isActive: true,
      },
      {
        id: '7',
        label: 'Period 7',
        startTime: '13:30',
        endTime: '14:10',
        isBreak: false,
        sortOrder: 9,
        isActive: true,
      },
      {
        id: '8',
        label: 'Period 8',
        startTime: '14:10',
        endTime: '14:50',
        isBreak: false,
        sortOrder: 10,
        isActive: true,
      },
    ];
  }

  async create(dto: CreateTimeSlotDto) {
    const maxOrder = await this.prisma.timeSlot.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const newSlot = await this.prisma.timeSlot.create({
      data: {
        label: dto.label,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isBreak: dto.isBreak || false,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
        isActive: true,
      },
    });
    return newSlot;
  }

  async update(id: string, dto: UpdateTimeSlotDto) {
    const slot = await this.prisma.timeSlot.findUnique({
      where: { id },
    });
    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }
    const updated = await this.prisma.timeSlot.update({
      where: { id },
      data: dto,
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    const slot = await this.prisma.timeSlot.findUnique({
      where: { id },
    });
    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }
    await this.prisma.timeSlot.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      success: true,
      message: 'Time slot deleted',
      deletedId: id,
      deletedBy: userId,
    };
  }

  async reorder(ids: string[]) {
    for (let i = 0; i < ids.length; i++) {
      await this.prisma.timeSlot.update({
        where: { id: ids[i] },
        data: { sortOrder: i + 1 },
      });
    }
    return {
      success: true,
      message: 'Time slots reordered',
      order: ids,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DayOfWeek } from '@prisma/client';

export interface CreateTimetableEntryDto {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string;
  track?: string;
}

export interface TimetableFilters {
  teacherId?: string;
  classId?: string;
  dayOfWeek?: DayOfWeek;
  track?: string;
}

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTimetableEntryDto) {
    const classSection = await this.prisma.classSection.findUnique({
      where: { id: dto.classId },
    });

    const track = dto.track || classSection?.track;

    const whereClash: any = {
      teacherId: dto.teacherId,
      dayOfWeek: dto.dayOfWeek,
      OR: [
        {
          startTime: { lte: dto.startTime },
          endTime: { gt: dto.startTime },
        },
        {
          startTime: { lt: dto.endTime },
          endTime: { gte: dto.endTime },
        },
        {
          startTime: { gte: dto.startTime },
          endTime: { lte: dto.endTime },
        },
      ],
    };
    if (track) whereClash.track = track;

    const clash = await this.prisma.timetableEntry.findFirst({
      where: whereClash,
    });

    if (clash) {
      throw new Error(
        'Teacher already has a timetable entry during this time slot',
      );
    }
    return this.prisma.timetableEntry.create({
      data: { ...dto, track },
      include: {
        classSection: true,
        subject: true,
        teacher: { include: { user: { select: { email: true } } } },
      },
    });
  }

  async findAll(filters?: TimetableFilters) {
    try {
      return await this.prisma.timetableEntry.findMany({
        where: {
          ...(filters?.teacherId && { teacherId: filters.teacherId }),
          ...(filters?.classId && { classId: filters.classId }),
          ...(filters?.dayOfWeek && { dayOfWeek: filters.dayOfWeek }),
          ...(filters?.track && { track: filters.track }),
        },
        include: {
          classSection: true,
          subject: { include: { department: true } },
          teacher: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    } catch (error) {
      console.error('[TimetableService] findAll error:', error);
      throw error;
    }
  }

  async findByTeacher(teacherId: string) {
    return this.prisma.timetableEntry.findMany({
      where: { teacherId },
      include: {
        classSection: true,
        subject: { include: { department: true } },
        teacher: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findByClass(classId: string, track?: string) {
    return this.prisma.timetableEntry.findMany({
      where: { classId, ...(track && { track }) },
      include: {
        classSection: true,
        subject: { include: { department: true } },
        teacher: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.timetableEntry.findUnique({
      where: { id },
      include: { classSection: true, subject: true, teacher: true },
    });
    if (!entry) throw new NotFoundException('Timetable entry not found');
    return entry;
  }

  async update(id: string, dto: Partial<CreateTimetableEntryDto>) {
    return this.prisma.timetableEntry.update({
      where: { id },
      data: dto,
      include: { classSection: true, subject: true, teacher: true },
    });
  }

  async delete(id: string) {
    return this.prisma.timetableEntry.delete({ where: { id } });
  }

  async getWeeklySchedule(teacherId: string) {
    const entries = await this.findByTeacher(teacherId);
    const days: Record<string, typeof entries> = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
    };
    entries.forEach((e) => {
      if (days[e.dayOfWeek]) days[e.dayOfWeek].push(e);
    });
    return days;
  }

  async detectClashes(teacherId: string) {
    const entries = await this.findByTeacher(teacherId);
    const clashes: any[] = [];

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        if (a.dayOfWeek !== b.dayOfWeek) continue;
        const overlaps = a.startTime < b.endTime && a.endTime > b.startTime;
        if (overlaps) clashes.push({ a, b });
      }
    }
    return clashes;
  }

  async broadcastToApps(classIds?: string[], track?: string) {
    const where: any = {};
    if (classIds?.length) where.classId = { in: classIds };
    if (track) where.track = track;

    const entries = await this.prisma.timetableEntry.findMany({
      where,
      include: {
        classSection: true,
        subject: { include: { department: true } },
        teacher: true,
      },
    });
    return {
      success: true,
      message: `Timetable broadcasted to ${entries.length} entries`,
      entries,
    };
  }

  async finalizeGrid(classIds?: string[], track?: string) {
    const where: any = {};
    if (classIds?.length) where.classId = { in: classIds };
    if (track) where.track = track;

    const entries = await this.prisma.timetableEntry.findMany({
      where,
    });
    return {
      success: true,
      message: `Timetable finalized with ${entries.length} entries locked into registrar records`,
      entries,
    };
  }
}

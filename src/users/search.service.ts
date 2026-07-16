import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

export interface GlobalSearchResult {
  id: string;
  type: 'student' | 'teacher' | 'parent' | 'staff' | 'department' | 'class';
  name: string;
  sublabel: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(
    user: { id: string; role: Role } | undefined,
    query: string,
  ): Promise<GlobalSearchResult[]> {
    const q = (query || '').trim();
    if (!q) return [];

    const departmentId =
      user?.role === Role.HOD
        ? (await this.prisma.staffProfile.findUnique({
            where: { userId: user.id },
          }))?.departmentId || undefined
        : undefined;

    const like = { contains: q, mode: 'insensitive' as const };

    const [students, teachers, parents, staff, departments, classes] =
      await Promise.all([
        this.prisma.studentProfile.findMany({
          where: {
            archivedAt: null,
            ...(departmentId ? { departmentId } : {}),
            OR: [
              { firstName: like },
              { lastName: like },
              { indexNumber: like },
            ],
          },
          include: { currentClass: true },
          take: 6,
        }),
        this.prisma.staffProfile.findMany({
          where: {
            user: { role: Role.TEACHER },
            ...(departmentId ? { departmentId } : {}),
            OR: [
              { firstName: like },
              { lastName: like },
              { staffId: like },
            ],
          },
          take: 6,
        }),
        this.prisma.parentProfile.findMany({
          where: {
            ...(departmentId
              ? {
                  studentLinks: {
                    some: { student: { departmentId } },
                  },
                }
              : {}),
            OR: [
              { firstName: like },
              { lastName: like },
              { phone: like },
              { email: like },
            ],
          },
          take: 6,
        }),
        this.prisma.staffProfile.findMany({
          where: {
            user: { role: { not: Role.TEACHER } },
            ...(departmentId ? { departmentId } : {}),
            OR: [
              { firstName: like },
              { lastName: like },
              { staffId: like },
            ],
          },
          include: { department: true },
          take: 6,
        }),
        this.prisma.department.findMany({
          where: {
            OR: [
              { name: like },
              { code: like },
              { description: like },
            ],
          },
          take: 6,
        }),
        this.prisma.classSection.findMany({
          where: {
            ...(departmentId ? { departmentId } : {}),
            OR: [{ name: like }, { program: like }, { track: like }],
          },
          take: 6,
        }),
      ]);

    const results: GlobalSearchResult[] = [
      ...students.map((s) => ({
        id: s.id,
        type: 'student' as const,
        name: `${s.firstName} ${s.lastName}`.trim() || s.indexNumber,
        sublabel: `Student • ${s.indexNumber}${
          s.currentClass ? ` • ${s.currentClass.name}` : ''
        }`,
      })),
      ...teachers.map((t) => ({
        id: t.id,
        type: 'teacher' as const,
        name: `${t.firstName} ${t.lastName}`.trim(),
        sublabel: `Teacher • ${t.staffId}`,
      })),
      ...parents.map((p) => ({
        id: p.id,
        type: 'parent' as const,
        name: `${p.firstName} ${p.lastName}`.trim(),
        sublabel: `Parent • ${p.phone || p.email || ''}`,
      })),
      ...staff.map((s) => ({
        id: s.id,
        type: 'staff' as const,
        name: `${s.firstName} ${s.lastName}`.trim(),
        sublabel: `Staff • ${s.staffId}${
          s.department ? ` • ${s.department.name}` : ''
        }`,
      })),
      ...departments.map((d) => ({
        id: d.id,
        type: 'department' as const,
        name: d.name,
        sublabel: `Department • ${d.code}`,
      })),
      ...classes.map((c) => ({
        id: c.id,
        type: 'class' as const,
        name: c.name,
        sublabel: `Class • ${c.program || c.level}${c.track ? ` • ${c.track}` : ''}`,
      })),
    ];

    return results.slice(0, 20);
  }
}

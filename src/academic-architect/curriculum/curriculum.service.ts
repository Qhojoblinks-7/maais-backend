import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/roles.decorator';

export interface CurriculumMappingDto {
  id: string;
  subjectId: string;
  classSectionId: string;
  academicYearId: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  creditHours: number;
  applicablePrograms: string[];
  className: string;
  classLevel: string;
  program: string;
}

@Injectable()
export class CurriculumService {
  constructor(private prisma: PrismaService) {}

  async getCurriculumMatrix(
    academicYearId: string,
    userId: string,
    role: Role,
  ): Promise<CurriculumMappingDto[]> {
    if (role !== Role.SUPER_ADMIN && role !== Role.HEADMASTER && role !== Role.HOD) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const mappings = await this.prisma.curriculumMapping.findMany({
      where: { academicYearId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            creditHours: true,
            applicablePrograms: true,
          },
        },
        classSection: {
          select: {
            id: true,
            name: true,
            level: true,
            program: true,
          },
        },
      },
      orderBy: [
        { subject: { name: 'asc' } },
        { classSection: { name: 'asc' } },
      ],
    });

    return mappings.map((m) => ({
      id: m.id,
      subjectId: m.subjectId,
      classSectionId: m.classSectionId,
      academicYearId: m.academicYearId,
    subjectName: m.subject.name,
      subjectCode: m.subject.code,
      subjectType: m.subject.type,
      creditHours: m.subject.creditHours,
      applicablePrograms: m.subject.applicablePrograms || [],
      className: m.classSection.name,
      classLevel: m.classSection.level,
      program: m.classSection.program || '',
    }));
  }

  async upsertCurriculumMapping(
    academicYearId: string,
    subjectId: string,
    classSectionId: string,
    userId: string,
    role: Role,
  ): Promise<CurriculumMappingDto> {
    if (role !== Role.SUPER_ADMIN && role !== Role.HEADMASTER && role !== Role.HOD) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const existing = await this.prisma.curriculumMapping.findUnique({
      where: {
        subjectId_classSectionId_academicYearId: {
          subjectId,
          classSectionId,
          academicYearId,
        },
      },
    });

    let mapping;
    if (existing) {
      mapping = await this.prisma.curriculumMapping.update({
        where: { id: existing.id },
        data: { isActive: true },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              creditHours: true,
              applicablePrograms: true,
            },
          },
          classSection: {
            select: {
              id: true,
              name: true,
              level: true,
              program: true,
            },
          },
        },
      });
    } else {
      mapping = await this.prisma.curriculumMapping.create({
        data: {
          subjectId,
          classSectionId,
          academicYearId,
          isActive: true,
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              creditHours: true,
              applicablePrograms: true,
            },
          },
          classSection: {
            select: {
              id: true,
              name: true,
              level: true,
              program: true,
            },
          },
        },
      });
    }

    return {
      id: mapping.id,
      subjectId: mapping.subjectId,
      classSectionId: mapping.classSectionId,
      academicYearId: mapping.academicYearId,
      subjectName: mapping.subject.name,
      subjectCode: mapping.subject.code,
      subjectType: mapping.subject.type,
      creditHours: mapping.subject.creditHours,
      applicablePrograms: mapping.subject.applicablePrograms || [],
      className: mapping.classSection.name,
      classLevel: mapping.classSection.level,
      program: mapping.classSection.program || '',
    };
  }

  async removeCurriculumMapping(
    academicYearId: string,
    subjectId: string,
    classSectionId: string,
    userId: string,
    role: Role,
  ): Promise<void> {
    if (role !== Role.SUPER_ADMIN && role !== Role.HEADMASTER && role !== Role.HOD) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const existing = await this.prisma.curriculumMapping.findUnique({
      where: {
        subjectId_classSectionId_academicYearId: {
          subjectId,
          classSectionId,
          academicYearId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Curriculum mapping not found');
    }

    await this.prisma.curriculumMapping.delete({
      where: { id: existing.id },
    });
  }

  async bulkUpsert(
    academicYearId: string,
    mappings: { subjectId: string; classSectionId: string }[],
    userId: string,
    role: Role,
  ): Promise<{ created: number; updated: number; total: number }> {
    if (role !== Role.SUPER_ADMIN && role !== Role.HEADMASTER && role !== Role.HOD) {
      throw new ForbiddenException('Insufficient permissions');
    }

    let created = 0;
    let updated = 0;

    for (const m of mappings) {
      const existing = await this.prisma.curriculumMapping.findUnique({
        where: {
          subjectId_classSectionId_academicYearId: {
            subjectId: m.subjectId,
            classSectionId: m.classSectionId,
            academicYearId,
          },
        },
      });

      if (existing) {
        await this.prisma.curriculumMapping.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        updated++;
      } else {
        await this.prisma.curriculumMapping.create({
          data: {
            subjectId: m.subjectId,
            classSectionId: m.classSectionId,
            academicYearId,
            isActive: true,
          },
        });
        created++;
      }
    }

    return { created, updated, total: mappings.length };
  }

  async deployCurriculum(
    academicYearId: string,
    userId: string,
    role: Role,
  ): Promise<{ success: boolean; message: string; deployedAt: string }> {
    if (role !== Role.SUPER_ADMIN && role !== Role.HEADMASTER) {
      throw new ForbiddenException('Only Super Admin and Headmaster can deploy curriculum');
    }

    const activeMappings = await this.prisma.curriculumMapping.count({
      where: { academicYearId, isActive: true },
    });

    if (activeMappings === 0) {
      throw new BadRequestException('No active curriculum mappings to deploy');
    }

    const now = new Date();
    await this.prisma.curriculumMapping.updateMany({
      where: { academicYearId, isActive: true, deployedAt: null },
      data: {
        deployedAt: now,
        deployedById: userId,
      },
    });

    return {
      success: true,
      message: `Curriculum deployed successfully with ${activeMappings} active mappings`,
      deployedAt: now.toISOString(),
    };
  }

  async getDeploymentStatus(academicYearId: string): Promise<{
    totalMappings: number;
    deployedMappings: number;
    lastDeployedAt: string | null;
    isDeployed: boolean;
  }> {
    const [totalMappings, deployedMappings] = await Promise.all([
      this.prisma.curriculumMapping.count({ where: { academicYearId } }),
      this.prisma.curriculumMapping.count({
        where: { academicYearId, deployedAt: { not: null } },
      }),
    ]);

    const lastDeployment = await this.prisma.curriculumMapping.findFirst({
      where: { academicYearId, deployedAt: { not: null } },
      select: { deployedAt: true },
      orderBy: { deployedAt: 'desc' },
    });

    return {
      totalMappings,
      deployedMappings,
      lastDeployedAt: lastDeployment?.deployedAt?.toISOString() || null,
      isDeployed: deployedMappings > 0,
    };
  }

  async getAllClassesWithStudents(user: any) {
    let classSectionIds: string[] | undefined;

    if (user?.role === Role.TEACHER) {
      const staff = await this.prisma.staffProfile.findUnique({
        where: { userId: user.id },
      });
      if (!staff) return [];
      const assignments = await this.prisma.teachingAssignment.findMany({
        where: { teacherId: staff.id },
        select: { classSectionId: true },
      });
      classSectionIds = assignments.map(a => a.classSectionId);
    }

    const classes = await this.prisma.classSection.findMany({
      where: classSectionIds ? { id: { in: classSectionIds } } : undefined,
      include: {
        classTeacher: true,
        _count: { select: { students: true } },
        students: {
          where: { archivedAt: null },
          select: { id: true, firstName: true, lastName: true },
          take: 8,
          orderBy: { firstName: 'asc' },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      capacity: c.capacity,
      studentsCount: c._count.students,
      studentPreviews: c.students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        initial: (s.firstName || '?')[0].toUpperCase(),
      })),
    }));
  }
}

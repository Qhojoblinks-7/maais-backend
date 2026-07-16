import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ModelName = 'StudentProfile' | 'GradeEntry' | 'AttendanceRecord';

interface PrismaModel {
  findUnique(params: {
    where: { id: string };
    select?: { version: boolean };
  }): Promise<{ version: number } | null>;
  update(params: {
    where: { id: string };
    data: { version: { increment: number } };
  }): Promise<{ version: number }>;
}

@Injectable()
export class OCCService {
  constructor(private prisma: PrismaService) {}

  private getModel(modelName: ModelName): PrismaModel {
    const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    return this.prisma[key];
  }

  async verifyVersion(
    modelName: ModelName,
    id: string,
    clientVersion: number,
  ): Promise<void> {
    const model = this.getModel(modelName);
    const record = await model.findUnique({
      where: { id },
      select: { version: true },
    });

    if (!record || record.version !== clientVersion) {
      throw new ConflictException(
        `${modelName} has been modified by another user. Please refresh and retry.`,
      );
    }
  }

  async bumpVersion(modelName: ModelName, id: string): Promise<number> {
    const model = this.getModel(modelName);
    const updated = await model.update({
      where: { id },
      data: { version: { increment: 1 } },
    });
    return updated.version;
  }

  async updateWithVersion<T>(
    modelName: ModelName,
    id: string,
    clientVersion: number,
    updateData: Record<string, any>,
  ): Promise<T> {
    await this.verifyVersion(modelName, id, clientVersion);

    const model = this.getModel(modelName);
    const updated = await model.update({
      where: { id },
      data: { ...updateData, version: { increment: 1 } },
    });

    return updated as T;
  }
}

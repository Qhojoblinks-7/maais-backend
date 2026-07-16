import { Test, TestingModule } from '@nestjs/testing';
import { OCCService } from './occ.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('OCCService', () => {
  let service: OCCService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      studentProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      gradeEntry: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      attendanceRecord: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OCCService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<OCCService>(OCCService);
    jest.clearAllMocks();
  });

  describe('verifyVersion', () => {
    it('throws ConflictException when record not found', async () => {
      mockPrisma.gradeEntry.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.verifyVersion('GradeEntry', 'invalid-id', 1),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when versions do not match', async () => {
      mockPrisma.gradeEntry.findUnique = jest
        .fn()
        .mockResolvedValue({ version: 2 });

      await expect(
        service.verifyVersion('GradeEntry', 'ge-1', 1),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('resolves when versions match', async () => {
      mockPrisma.gradeEntry.findUnique = jest
        .fn()
        .mockResolvedValue({ version: 1 });

      await expect(
        service.verifyVersion('GradeEntry', 'ge-1', 1),
      ).resolves.toBeUndefined();
    });

    it('works for StudentProfile', async () => {
      mockPrisma.studentProfile.findUnique = jest
        .fn()
        .mockResolvedValue({ version: 5 });

      await expect(
        service.verifyVersion('StudentProfile', 'sp-1', 5),
      ).resolves.toBeUndefined();
    });

    it('works for AttendanceRecord', async () => {
      mockPrisma.attendanceRecord.findUnique = jest
        .fn()
        .mockResolvedValue({ version: 3 });

      await expect(
        service.verifyVersion('AttendanceRecord', 'ar-1', 3),
      ).resolves.toBeUndefined();
    });
  });

  describe('bumpVersion', () => {
    it('increments version and returns new version', async () => {
      mockPrisma.gradeEntry.update = jest
        .fn()
        .mockResolvedValue({ version: 5 });

      const result = await service.bumpVersion('GradeEntry', 'ge-1');

      expect(result).toBe(5);
      expect(mockPrisma.gradeEntry.update).toHaveBeenCalledWith({
        where: { id: 'ge-1' },
        data: { version: { increment: 1 } },
      });
    });
  });

  describe('updateWithVersion', () => {
    it('verifies version then updates record', async () => {
      mockPrisma.gradeEntry.findUnique = jest
        .fn()
        .mockResolvedValue({ version: 2 });
      mockPrisma.gradeEntry.update = jest
        .fn()
        .mockResolvedValue({ id: 'ge-1', status: 'UPDATED' });

      const result = await service.updateWithVersion('GradeEntry', 'ge-1', 2, {
        status: 'UPDATED',
      });

      expect((result as any).id).toBe('ge-1');
      expect(mockPrisma.gradeEntry.update).toHaveBeenCalledWith({
        where: { id: 'ge-1' },
        data: { status: 'UPDATED', version: { increment: 1 } },
      });
    });
  });
});

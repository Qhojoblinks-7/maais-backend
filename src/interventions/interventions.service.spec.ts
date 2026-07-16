import { Test, TestingModule } from '@nestjs/testing';
import { InterventionsService } from './interventions.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('InterventionsService', () => {
  let service: InterventionsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      studentProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      interventionAlert: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterventionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InterventionsService>(InterventionsService);
    jest.clearAllMocks();
  });

  describe('getStudentInterventions', () => {
    it('returns interventions for admin/HOD', async () => {
      mockPrisma.interventionAlert.findMany = jest
        .fn()
        .mockResolvedValue([{ id: 'ia-1', studentId: 's1' }]);

      const result = await service.getStudentInterventions(
        's1',
        'user-1',
        Role.HOD,
      );

      expect(result.length).toBe(1);
      expect(mockPrisma.interventionAlert.findMany).toHaveBeenCalledWith({
        where: { studentId: 's1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('resolves student ID for student role', async () => {
      mockPrisma.studentProfile.findUnique = jest.fn().mockResolvedValue({
        id: 'student-profile-1',
      });
      mockPrisma.interventionAlert.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getStudentInterventions(
        'student-profile-1',
        'user-1',
        Role.STUDENT,
      );

      expect(result).toEqual([]);
      expect(mockPrisma.studentProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { id: true },
      });
    });

    it('throws when student profile not found', async () => {
      mockPrisma.studentProfile.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.getStudentInterventions('s1', 'user-1', Role.STUDENT),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('checkPerformanceDrop', () => {
    it('creates alert when drop >= 15%', async () => {
      mockPrisma.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce([{ avg: 70 }])
        .mockResolvedValueOnce([{ avg: 50 }]);
      mockPrisma.interventionAlert.findFirst = jest
        .fn()
        .mockResolvedValue(null);
      mockPrisma.interventionAlert.create = jest.fn().mockResolvedValue({
        id: 'ia-1',
        status: 'ACTIVE',
      });

      await service.checkPerformanceDrop('s1', 'term-current', 'term-previous');

      expect(mockPrisma.interventionAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId: 's1',
            dropPercentage: expect.any(Number),
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('does nothing when no previous average', async () => {
      mockPrisma.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce([{ avg: null }])
        .mockResolvedValueOnce([{ avg: 60 }]);

      await service.checkPerformanceDrop('s1', 'term-current', 'term-previous');

      expect(mockPrisma.interventionAlert.create).not.toHaveBeenCalled();
    });

    it('does nothing when no current average', async () => {
      mockPrisma.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce([{ avg: 70 }])
        .mockResolvedValueOnce([{ avg: null }]);

      await service.checkPerformanceDrop('s1', 'term-current', 'term-previous');

      expect(mockPrisma.interventionAlert.create).not.toHaveBeenCalled();
    });

    it('does nothing when drop < 15%', async () => {
      mockPrisma.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce([{ avg: 80 }])
        .mockResolvedValueOnce([{ avg: 72 }]);

      await service.checkPerformanceDrop('s1', 'term-current', 'term-previous');

      expect(mockPrisma.interventionAlert.create).not.toHaveBeenCalled();
    });

    it('does not duplicate existing active alert', async () => {
      mockPrisma.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce([{ avg: 70 }])
        .mockResolvedValueOnce([{ avg: 50 }]);
      mockPrisma.interventionAlert.findFirst = jest.fn().mockResolvedValue({
        id: 'existing-ia',
        status: 'ACTIVE',
      });

      await service.checkPerformanceDrop('s1', 'term-current', 'term-previous');

      expect(mockPrisma.interventionAlert.create).not.toHaveBeenCalled();
    });
  });
});

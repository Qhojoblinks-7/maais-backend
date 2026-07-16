import { Test, TestingModule } from '@nestjs/testing';
import { ArchiveService } from './archive.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { ClassLevel, Role } from '@prisma/client';

describe('ArchiveService', () => {
  let service: ArchiveService;
  let mockPrisma: any;

  function createMockPrisma() {
    return {
      academicYear: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      term: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      studentProfile: {
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      classSection: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      promotionRecord: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      reportCard: {
        count: jest.fn(),
      },
      transcript: {
        count: jest.fn(),
      },
      department: {
        count: jest.fn(),
      },
      subject: {
        count: jest.fn(),
      },
      gradeEntry: {
        count: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      attendanceRecord: {
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
      },
      supportTicket: {
        findMany: jest.fn(),
      },
      staffProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      teachingAssignment: {
        findMany: jest.fn(),
      },
    };
  }

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ArchiveService>(ArchiveService);
    jest.clearAllMocks();
  });

  describe('runPromotionCycle', () => {
    it('throws when unlocked terms exist', async () => {
      mockPrisma.academicYear.findUnique = jest.fn().mockResolvedValue({
        id: 'year-1',
        label: '2024/2025',
      });
      mockPrisma.term.findMany = jest
        .fn()
        .mockResolvedValue([{ id: 'term-1', isLocked: false }]);

      await expect(
        service.runPromotionCycle('year-1', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('promotes F1 to F2', async () => {
      mockPrisma.academicYear.findUnique = jest.fn().mockResolvedValue({
        id: 'year-1',
        label: '2024/2025',
      });
      mockPrisma.term.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.studentProfile.findMany = jest.fn().mockResolvedValue([
        {
          id: 's1',
          currentClass: { id: 'c1', name: '1A', level: ClassLevel.FORM_1 },
        },
      ]);
      mockPrisma.classSection.findFirst = jest.fn().mockResolvedValue({
        id: 'c2',
        name: '2A',
      });
      mockPrisma.studentProfile.update = jest.fn().mockResolvedValue({});
      mockPrisma.promotionRecord.createMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const result = await service.runPromotionCycle('year-1', 'user-1');

      expect(result.promoted).toBe(1);
      expect(result.graduated).toBe(0);
      expect(mockPrisma.studentProfile.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { currentClassId: 'c2' },
      });
    });

    it('graduates F3 students', async () => {
      mockPrisma.academicYear.findUnique = jest.fn().mockResolvedValue({
        id: 'year-1',
        label: '2024/2025',
      });
      mockPrisma.term.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.studentProfile.findMany = jest.fn().mockResolvedValue([
        {
          id: 's1',
          currentClass: { id: 'c1', name: '3A', level: ClassLevel.FORM_3 },
        },
      ]);
      mockPrisma.studentProfile.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });
      mockPrisma.promotionRecord.createMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const result = await service.runPromotionCycle('year-1', 'user-1');

      expect(result.graduated).toBe(1);
      expect(result.promoted).toBe(0);
      expect(mockPrisma.studentProfile.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['s1'] } },
        }),
      );
    });
  });

  describe('searchVault', () => {
    it('returns results for HOD filtered by department', async () => {
      mockPrisma.staffProfile.findUnique = jest.fn().mockResolvedValue({
        id: 'staff-1',
        departmentId: 'dept-1',
      });
      mockPrisma.studentProfile.findMany = jest.fn().mockResolvedValue([
        {
          id: 's1',
          firstName: 'John',
          lastName: 'Doe',
          currentClass: { id: 'c1', name: '1A', level: ClassLevel.FORM_1 },
          department: { name: 'Science' },
          grades: [],
          reportCards: [],
          promotions: [],
        },
      ]);

      const result = await service.searchVault(
        { firstName: 'John' },
        'user-1',
        Role.HOD,
      );

      expect(result.length).toBe(1);
      expect(result[0].firstName).toBe('John');
    });

    it('returns results for TEACHER filtered by taught students', async () => {
      mockPrisma.staffProfile.findUnique = jest.fn().mockResolvedValue({
        id: 'staff-1',
        departmentId: null,
      });
      mockPrisma.gradeEntry.findMany = jest
        .fn()
        .mockResolvedValue([{ studentId: 's1' }]);
      mockPrisma.studentProfile.findMany = jest.fn().mockResolvedValue([
        {
          id: 's1',
          firstName: 'Jane',
          lastName: 'Doe',
          currentClass: { id: 'c1', name: '1A', level: ClassLevel.FORM_1 },
          department: null,
          grades: [],
          reportCards: [],
          promotions: [],
        },
      ]);

      const result = await service.searchVault(
        { firstName: 'Jane' },
        'user-1',
        Role.TEACHER,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('lockTerm', () => {
    it('locks a term', async () => {
      mockPrisma.term.update = jest.fn().mockResolvedValue({
        id: 'term-1',
        isLocked: true,
      });

      const result = await service.lockTerm('term-1');

      expect(result.isLocked).toBe(true);
      expect(mockPrisma.term.update).toHaveBeenCalledWith({
        where: { id: 'term-1' },
        data: { isLocked: true },
      });
    });
  });

  describe('lockAllTerms', () => {
    it('locks all unlocked terms for year', async () => {
      mockPrisma.term.updateMany = jest.fn().mockResolvedValue({ count: 3 });

      const result = await service.lockAllTerms('year-1');

      expect(result.count).toBe(3);
      expect(mockPrisma.term.updateMany).toHaveBeenCalledWith({
        where: { academicYearId: 'year-1', isLocked: false },
        data: { isLocked: true },
      });
    });
  });

  describe('getDatabaseHealth', () => {
    it('returns health metrics', async () => {
      mockPrisma.studentProfile.count = jest
        .fn()
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(10);
      mockPrisma.gradeEntry.count = jest.fn().mockResolvedValue(500);
      mockPrisma.reportCard.count = jest.fn().mockResolvedValue(50);
      mockPrisma.transcript.count = jest.fn().mockResolvedValue(10);

      const result = await service.getDatabaseHealth();

      expect(result.status).toBe('healthy');
      expect(result.counts.totalStudents).toBe(100);
      expect(result.counts.totalGrades).toBe(500);
    });
  });

  describe('getArchiveStats', () => {
    it('returns archive statistics', async () => {
      mockPrisma.studentProfile.count = jest
        .fn()
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(10);
      mockPrisma.promotionRecord.count = jest.fn().mockResolvedValue(50);
      mockPrisma.reportCard.count = jest.fn().mockResolvedValue(50);
      mockPrisma.transcript.count = jest.fn().mockResolvedValue(10);
      mockPrisma.department.count = jest.fn().mockResolvedValue(5);
      mockPrisma.subject.count = jest.fn().mockResolvedValue(30);
      mockPrisma.promotionRecord.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.studentProfile.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getArchiveStats('year-1');

      expect(result.totalStudents).toBe(90);
      expect(result.archivedStudents).toBe(10);
      expect(result.totalPromotions).toBe(50);
    });
  });

  describe('archiveYearGroup', () => {
    it('archives all students in level', async () => {
      mockPrisma.academicYear.findUnique = jest.fn().mockResolvedValue({
        id: 'year-1',
        label: '2024/2025',
      });
      mockPrisma.classSection.findMany = jest
        .fn()
        .mockResolvedValue([{ id: 'c1' }]);
      mockPrisma.studentProfile.findMany = jest
        .fn()
        .mockResolvedValue([
          { id: 's1', currentClass: { level: ClassLevel.FORM_3 } },
        ]);
      mockPrisma.studentProfile.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });
      mockPrisma.promotionRecord.createMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const result = await service.archiveYearGroup(
        'year-1',
        ClassLevel.FORM_3,
        'user-1',
      );

      expect(result.archivedCount).toBe(1);
      expect(mockPrisma.studentProfile.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { currentClassId: { in: ['c1'] }, archivedAt: null },
        }),
      );
    });
  });

  describe('transferStudents', () => {
    it('transfers students between classes', async () => {
      mockPrisma.classSection.findUniqueOrThrow = jest
        .fn()
        .mockResolvedValueOnce({ id: 'from-class', name: '1A' })
        .mockResolvedValueOnce({ id: 'to-class', name: '1B' });
      mockPrisma.studentProfile.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 5 });

      const result = await service.transferStudents('from-class', 'to-class', [
        's1',
        's2',
      ]);

      expect(result.transferredCount).toBe(5);
      expect(result.from).toBe('1A');
      expect(result.to).toBe('1B');
    });
  });

  describe('getClassBenchmarks', () => {
    it('returns average scores per term', async () => {
      mockPrisma.studentProfile.findMany = jest
        .fn()
        .mockResolvedValue([{ id: 's1' }]);
      mockPrisma.gradeEntry.findMany = jest.fn().mockResolvedValue([
        {
          totalScore: 75,
          termId: 'term-1',
          term: { academicYear: { label: '2024' }, termNumber: 'TERM_1' },
        },
        {
          totalScore: 80,
          termId: 'term-1',
          term: { academicYear: { label: '2024' }, termNumber: 'TERM_1' },
        },
      ]);

      const result = await service.getClassBenchmarks('class-1');

      expect(result.length).toBe(1);
      expect(result[0].averageScore).toBe(78);
    });

    it('returns empty when no students', async () => {
      mockPrisma.studentProfile.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getClassBenchmarks('class-1');

      expect(result).toEqual([]);
    });
  });

  describe('getPromotionHistory', () => {
    it('returns promotion records', async () => {
      mockPrisma.promotionRecord.findMany = jest
        .fn()
        .mockResolvedValue([
          { id: 'p1', academicYear: { label: '2024/2025' } },
        ]);

      const result = await service.getPromotionHistory('student-1');

      expect(result.length).toBe(1);
      expect(mockPrisma.promotionRecord.findMany).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        include: { academicYear: true },
        orderBy: { performedAt: 'desc' },
      });
    });
  });
});

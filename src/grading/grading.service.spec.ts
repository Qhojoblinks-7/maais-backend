import { Test, TestingModule } from '@nestjs/testing';
import { GradingService } from './grading.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { InterventionsService } from '../interventions/interventions.service';
import { OCCService } from '../common/services/occ.service';
import { ForbiddenException } from '@nestjs/common';
import { GradeRemark, Role } from '@prisma/client';

describe('GradingService', () => {
  let service: GradingService;

  const mockPrisma = {
    term: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    gradeEntry: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    gradeCorrection: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    studentProfile: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    staffProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    teachingAssignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    subject: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    classSection: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    academicYear: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    interventionAlert: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockInterventions = {
    checkPerformanceDrop: jest.fn(),
  };

  const mockOCC = {
    verifyVersion: jest.fn(),
    bumpVersion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InterventionsService, useValue: mockInterventions },
        { provide: OCCService, useValue: mockOCC },
      ],
    }).compile();

    service = module.get<GradingService>(GradingService);
    jest.clearAllMocks();
  });

  describe('computeGrade', () => {
    it('returns A1 for score 100', () => {
      const result = (service as any).computeGrade(50, 50);
      expect(result.grade).toBe('A1');
      expect(result.totalScore).toBe(100);
      expect(result.remark).toBe(GradeRemark.EXCELLENT);
    });

    it('returns F9 for score 0', () => {
      const result = (service as any).computeGrade(0, 0);
      expect(result.grade).toBe('F9');
      expect(result.totalScore).toBe(0);
      expect(result.remark).toBe(GradeRemark.FAILURE);
    });

    it('returns B2 for score 75', () => {
      const result = (service as any).computeGrade(30, 45);
      expect(result.grade).toBe('B2');
      expect(result.totalScore).toBe(75);
    });

    it('caps grades > 100 to A1', () => {
      const result = (service as any).computeGrade(100, 100);
      expect(result.totalScore).toBe(200);
      expect(result.grade).toBe('A1');
    });

    it('returns correct grade for boundary 50 (C6)', () => {
      const result = (service as any).computeGrade(20, 30);
      expect(result.grade).toBe('C6');
    });
  });

  describe('getSmartRemarks', () => {
    it('returns remarks for valid grade', () => {
      const remarks = (service as any).getSmartRemarks('A1');
      expect(remarks.length).toBeGreaterThan(0);
    });

    it('returns empty array for invalid grade', () => {
      const remarks = (service as any).getSmartRemarks('Z9');
      expect(remarks).toEqual([]);
    });
  });

  describe('upsertGrade', () => {
    it('throws when term is locked', async () => {
      mockPrisma.term.findUniqueOrThrow = jest.fn().mockResolvedValue({
        id: 'term-1',
        isLocked: true,
      });

      await expect(
        service.upsertGrade(
          { studentId: 's1', subjectId: 'sub1', termId: 'term-1' },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when grade entry is locked', async () => {
      mockPrisma.term.findUniqueOrThrow = jest.fn().mockResolvedValue({
        id: 'term-1',
        isLocked: false,
      });
      mockPrisma.gradeEntry.findFirst = jest.fn().mockResolvedValue({
        id: 'ge-1',
        isLocked: true,
        version: 1,
      });

      await expect(
        service.upsertGrade(
          { studentId: 's1', subjectId: 'sub1', termId: 'term-1' },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates new grade entry when none exists', async () => {
      mockPrisma.term.findUniqueOrThrow = jest.fn().mockResolvedValue({
        id: 'term-1',
        isLocked: false,
      });
      mockPrisma.gradeEntry.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.gradeEntry.upsert = jest.fn().mockResolvedValue({
        id: 'ge-new',
        studentId: 's1',
        subjectId: 'sub1',
        termId: 'term-1',
        version: 1,
      });
      mockPrisma.gradeEntry.findUnique = jest.fn().mockResolvedValue({
        id: 'ge-new',
        version: 1,
      });
      mockPrisma.auditLog.create = jest.fn().mockResolvedValue({});
      mockPrisma.term.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.academicYear.findFirst = jest.fn().mockResolvedValue(null);
      mockOCC.bumpVersion = jest.fn().mockResolvedValue(2);

      const result = await service.upsertGrade(
        {
          studentId: 's1',
          subjectId: 'sub1',
          termId: 'term-1',
          classScore: 25,
          examScore: 35,
        },
        'user-1',
      );

      expect(result.id).toBe('ge-new');
      expect(mockPrisma.gradeEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            studentId: 's1',
            classScore: 25,
            examScore: 35,
            totalScore: 60,
            grade: 'C4',
            submittedById: 'user-1',
            termId: 'term-1',
            subjectId: 'sub1',
          }),
        }),
      );
    });

    it('computes grade from classScore and examScore', async () => {
      mockPrisma.term.findUniqueOrThrow = jest.fn().mockResolvedValue({
        id: 'term-1',
        isLocked: false,
      });
      mockPrisma.gradeEntry.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.gradeEntry.upsert = jest.fn().mockResolvedValue({
        id: 'ge-new',
        version: 1,
        grade: 'B2',
        totalScore: 93,
      });
      mockPrisma.gradeEntry.findUnique = jest.fn().mockResolvedValue({
        id: 'ge-new',
        version: 1,
      });
      mockPrisma.auditLog.create = jest.fn().mockResolvedValue({});
      mockPrisma.term.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.academicYear.findFirst = jest.fn().mockResolvedValue(null);
      mockOCC.bumpVersion = jest.fn().mockResolvedValue(2);

      const result = await service.upsertGrade(
        {
          studentId: 's1',
          subjectId: 'sub1',
          termId: 'term-1',
          classScore: 28,
          examScore: 65,
        },
        'user-1',
      );

      expect(result.grade).toBe('B2');
      expect(result.totalScore).toBe(93);
    });
  });

  describe('approveGrade', () => {
    it('throws for unauthorized roles', async () => {
      await expect(
        service.approveGrade('ge-1', 'user-1', Role.TEACHER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('approves grade for HOD', async () => {
      mockPrisma.gradeEntry.update = jest.fn().mockResolvedValue({
        id: 'ge-1',
        isApproved: true,
        approvedAt: new Date(),
      });
      mockPrisma.gradeEntry.findUnique = jest.fn().mockResolvedValue({
        id: 'ge-1',
        version: 2,
        isApproved: true,
        approvedAt: new Date(),
      });
      mockPrisma.auditLog.create = jest.fn().mockResolvedValue({});

      const result = await service.approveGrade('ge-1', 'user-1', Role.HOD);

      expect(result.isApproved).toBe(true);
      expect(mockPrisma.gradeEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isApproved: true,
            approvedById: 'user-1',
          }),
        }),
      );
    });
  });

  describe('lockGrade', () => {
    it('throws for unauthorized roles', async () => {
      await expect(
        service.lockGrade('ge-1', 'user-1', Role.TEACHER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('locks grade for HOD', async () => {
      mockPrisma.gradeEntry.update = jest.fn().mockResolvedValue({
        id: 'ge-1',
        isLocked: true,
        lockedAt: new Date(),
      });
      mockPrisma.auditLog.create = jest.fn().mockResolvedValue({});
      mockOCC.bumpVersion = jest.fn().mockResolvedValue(3);

      const result = await service.lockGrade('ge-1', 'user-1', Role.HOD);

      expect(result.isLocked).toBe(true);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOCK',
            entity: 'GradeEntry',
          }),
        }),
      );
    });
  });

  describe('correctGrade', () => {
    it('throws when grade is locked', async () => {
      mockPrisma.gradeEntry.findUniqueOrThrow = jest.fn().mockResolvedValue({
        id: 'ge-1',
        isLocked: true,
        classScore: 25,
        examScore: 35,
        grade: 'B2',
        version: 1,
      });

      await expect(
        service.correctGrade(
          {
            gradeEntryId: 'ge-1',
            fieldChanged: 'classScore',
            newValue: '30',
            reason: 'Data entry error',
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates correction and updates grade', async () => {
      mockPrisma.gradeEntry.findUniqueOrThrow = jest.fn().mockResolvedValue({
        id: 'ge-1',
        isLocked: false,
        classScore: 25,
        examScore: 35,
        grade: 'B2',
        version: 1,
      });
      mockPrisma.gradeCorrection.create = jest.fn().mockResolvedValue({});
      mockPrisma.auditLog.create = jest.fn().mockResolvedValue({});
      mockPrisma.gradeEntry.update = jest.fn().mockResolvedValue({
        id: 'ge-1',
      });
      mockOCC.bumpVersion = jest.fn().mockResolvedValue(2);

      const result = await service.correctGrade(
        {
          gradeEntryId: 'ge-1',
          version: 1,
          fieldChanged: 'classScore',
          newValue: '28',
          reason: 'Data entry error',
        },
        'user-1',
      );

      expect(mockPrisma.gradeCorrection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldChanged: 'classScore',
            oldValue: '25',
            newValue: '28',
            reason: 'Data entry error',
          }),
        }),
      );
      expect(result.version).toBe(2);
    });
  });

  describe('bulkUpsertGrades', () => {
    it('processes all entries and computes positions', async () => {
      const upsertSpy = jest.spyOn(service, 'upsertGrade').mockResolvedValue({
        id: 'ge-1',
        version: 1,
      } as any);
      mockPrisma.gradeEntry.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.gradeEntry.update = jest.fn().mockResolvedValue({});
      mockPrisma.auditLog.create = jest.fn().mockResolvedValue({});
      mockPrisma.term.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.academicYear.findFirst = jest.fn().mockResolvedValue(null);
      mockOCC.bumpVersion = jest.fn().mockResolvedValue(2);
      mockInterventions.checkPerformanceDrop = jest.fn().mockResolvedValue({});

      const entries = [
        {
          studentId: 's1',
          subjectId: 'sub1',
          termId: 'term-1',
          classScore: 25,
          examScore: 35,
        },
        {
          studentId: 's2',
          subjectId: 'sub1',
          termId: 'term-1',
          classScore: 28,
          examScore: 40,
        },
      ];

      const result = await service.bulkUpsertGrades(entries, 'user-1');

      expect(result.length).toBe(2);
      expect(upsertSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('getClassPerformanceSummary', () => {
    it('throws when teacher is not assigned to class', async () => {
      mockPrisma.staffProfile.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'staff-1' });
      mockPrisma.teachingAssignment.findFirst = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        service.getClassPerformanceSummary(
          'class-1',
          'term-1',
          'user-1',
          Role.TEACHER,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns performance summary', async () => {
      mockPrisma.staffProfile.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'staff-1' });
      mockPrisma.teachingAssignment.findFirst = jest
        .fn()
        .mockResolvedValue({ id: 'ta-1' });
      mockPrisma.studentProfile.findMany = jest.fn().mockResolvedValue([
        {
          id: 's1',
          firstName: 'John',
          lastName: 'Doe',
          indexNumber: '001',
          grades: [],
        },
        {
          id: 's2',
          firstName: 'Jane',
          lastName: 'Doe',
          indexNumber: '002',
          grades: [{ isApproved: true }],
        },
      ]);

      const result = await service.getClassPerformanceSummary(
        'class-1',
        'term-1',
        'user-1',
        Role.TEACHER,
      );

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('John Doe');
    });
  });

  describe('getMissingObservationsTray', () => {
    it('returns empty for teacher with no accessible students', async () => {
      mockPrisma.staffProfile.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'staff-1' });
      mockPrisma.teachingAssignment.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.studentProfile.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.gradeEntry.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getMissingObservationsTray(
        'term-1',
        'user-1',
        Role.TEACHER,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getComplianceWarnings', () => {
    it('throws for unauthorized roles', async () => {
      await expect(
        service.getComplianceWarnings('user-1', Role.TEACHER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns warnings when term is locked', async () => {
      mockPrisma.term.findFirst = jest.fn().mockResolvedValue({
        id: 'term-1',
        isLocked: true,
      });
      mockPrisma.gradeEntry.count = jest.fn().mockResolvedValue(0);

      const result = await service.getComplianceWarnings('user-1', Role.HOD);

      expect(result.some((w: any) => w.msg.includes('locked'))).toBe(true);
    });
  });

  describe('getTermSummary', () => {
    it('throws for unauthorized roles', async () => {
      await expect(
        service.getTermSummary('term-1', 'user-1', Role.TEACHER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns term summary for HOD', async () => {
      mockPrisma.term.findUnique = jest.fn().mockResolvedValue({
        id: 'term-1',
        academicYearId: 'year-1',
        academicYear: { label: '2024/2025' },
        termNumber: 'TERM_1',
      });
      mockPrisma.classSection.findMany = jest
        .fn()
        .mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      mockPrisma.studentProfile.count = jest.fn().mockResolvedValue(50);
      mockPrisma.gradeEntry.count = jest.fn().mockResolvedValue(200);

      const result = await service.getTermSummary('term-1', 'user-1', Role.HOD);

      expect(result.termLabel).toBe('2024/2025 — Term 1');
      expect(result.studentCount).toBe(50);
      expect(result.gradeEntryCount).toBe(200);
    });
  });

  describe('getStudentTermGrades', () => {
    it('returns grades for student', async () => {
      mockPrisma.gradeEntry.findMany = jest
        .fn()
        .mockResolvedValue([
          { id: 'ge-1', subject: { name: 'Math' }, corrections: [] },
        ]);

      const result = await service.getStudentTermGrades(
        'student-1',
        'term-1',
        Role.HOD,
      );

      expect(result.length).toBe(1);
      expect(result[0].subject.name).toBe('Math');
    });

    it('filters approved grades for student role', async () => {
      mockPrisma.gradeEntry.findMany = jest.fn().mockResolvedValue([]);

      await service.getStudentTermGrades('student-1', 'term-1', Role.STUDENT);

      expect(mockPrisma.gradeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isApproved: true }),
        }),
      );
    });
  });
});

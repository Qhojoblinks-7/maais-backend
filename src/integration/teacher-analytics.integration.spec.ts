import { Test, TestingModule } from '@nestjs/testing';
import { TeacherService } from '../teacher/teacher.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { OCCService } from '../common/services/occ.service';
import { Role } from '@prisma/client';

describe('TeacherService - getAnalytics (integration)', () => {
  let service: TeacherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherService,
        {
          provide: PrismaService,
          useValue: {
            staffProfile: {
              findUnique: jest.fn(),
            },
            term: {
              findFirst: jest.fn(),
            },
            teachingAssignment: {
              findMany: jest.fn(),
            },
            studentProfile: {
              findMany: jest.fn(),
            },
            gradeEntry: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            getCachedAggregate: jest.fn(),
            setCachedAggregate: jest.fn(),
          },
        },
        {
          provide: OCCService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TeacherService>(TeacherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return analytics structure with pagination', async () => {
    const mockStaffProfile = { id: 'teacher-1', userId: 'user-1' };
    const mockActiveTerm = {
      id: 'term-1',
      termNumber: 'TERM_1',
      academicYearId: 'year-1',
      startDate: new Date(),
    };
    const mockAssignments = [];
    const mockStudents = [];
    const mockGrades = [];

    jest
      .spyOn(service['prisma'].staffProfile, 'findUnique')
      .mockResolvedValue(mockStaffProfile as any);
    jest
      .spyOn(service['prisma'].term, 'findFirst')
      .mockResolvedValue(mockActiveTerm as any);
    jest
      .spyOn(service['prisma'].teachingAssignment, 'findMany')
      .mockResolvedValue(mockAssignments as any);
    jest
      .spyOn(service['prisma'].studentProfile, 'findMany')
      .mockResolvedValue(mockStudents as any);
    jest
      .spyOn(service['prisma'].gradeEntry, 'findMany')
      .mockResolvedValue(mockGrades as any);
    jest
      .spyOn(service['cacheService'], 'getCachedAggregate')
      .mockResolvedValue(null);

    const result = await service.getAnalytics(
      'teacher-1',
      {
        id: 'user-1',
        role: Role.TEACHER,
        staffProfile: { id: 'teacher-1' },
      },
      1,
      50,
    );

    expect(result).toHaveProperty('observations');
    expect(result).toHaveProperty('classProgress');
    expect(result).toHaveProperty('studentScores');
    expect(result).toHaveProperty('termTrends');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
    expect(result).toHaveProperty('pages');
    expect(Array.isArray(result.classProgress)).toBe(true);
    expect(Array.isArray(result.studentScores)).toBe(true);
  });
});

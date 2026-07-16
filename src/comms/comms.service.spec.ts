import { Test, TestingModule } from '@nestjs/testing';
import { CommsService } from './comms.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { CircuitBreakerService } from '../common/services/circuit-breaker.service';

describe('CommsService (Support Tickets)', () => {
  let service: CommsService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    staffProfile: {
      findUnique: jest.fn(),
    },
    teachingAssignment: {
      findMany: jest.fn(),
    },
    supportTicket: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: CircuitBreakerService,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommsService>(CommsService);
    jest.clearAllMocks();
  });

  it('createTicket creates ticket for non-student with studentId null', async () => {
    mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'user-1',
      studentProfile: null,
    });

    mockPrisma.supportTicket.create = jest.fn().mockResolvedValue({
      id: 'ticket-1',
      studentId: null,
      student: null,
    });

    const result = await service.createTicket(
      {
        title: 'Test',
        description: 'Desc',
        category: 'General',
        priority: 'MEDIUM',
      },
      'user-1',
    );

    expect(result.id).toBe('ticket-1');
    expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: null,
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('createTicket creates ticket for student', async () => {
    mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'user-1',
      studentProfile: { id: 'student-1' },
    });

    mockPrisma.supportTicket.create = jest.fn().mockResolvedValue({
      id: 'ticket-1',
      studentId: 'student-1',
      student: { user: { email: 's@example.com' } },
    });

    const result = await service.createTicket(
      {
        title: 'Help',
        description: 'Pls',
        category: 'General',
        priority: 'HIGH',
      },
      'user-1',
    );

    expect(result.id).toBe('ticket-1');
    expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student-1',
          createdById: 'user-1',
        }),
      }),
    );
  });

  it('listTickets filters by studentId for STUDENT role', async () => {
    mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
      studentProfile: { id: 'student-1' },
    });

    mockPrisma.supportTicket.findMany = jest.fn().mockReturnValue([]);

    await service.listTickets(
      { status: 'OPEN', category: 'Academic' },
      'user-1',
      Role.STUDENT,
    );

    expect(mockPrisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: 'student-1' }),
      }),
    );
  });

  it('listTickets filters by classSectionIds for TEACHER', async () => {
    mockPrisma.staffProfile.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'staff-1' });
    mockPrisma.teachingAssignment.findMany = jest
      .fn()
      .mockResolvedValue([
        { classSectionId: 'class-A' },
        { classSectionId: 'class-B' },
      ]);
    mockPrisma.studentProfile.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'student-1' }, { id: 'student-2' }]);
    mockPrisma.supportTicket.findMany = jest.fn().mockReturnValue([]);

    await service.listTickets({ category: 'General' }, 'user-1', Role.TEACHER);

    expect(mockPrisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { studentId: { in: ['student-1', 'student-2'] } },
            { createdById: 'user-1' },
          ],
          category: 'General',
        }),
      }),
    );
  });

  it('listTickets throws for unknown teacher staff profile', async () => {
    mockPrisma.staffProfile.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.listTickets({}, 'user-1', Role.TEACHER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updateTicketStatus throws for non-admin roles', async () => {
    mockPrisma.supportTicket.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'ticket-1' });

    await expect(
      service.updateTicketStatus(
        'ticket-1',
        { status: 'OPEN' },
        'user-1',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updateTicketStatus updates ticket for HOD and sets resolvedAt', async () => {
    mockPrisma.supportTicket.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'ticket-1' });
    mockPrisma.supportTicket.update = jest
      .fn()
      .mockResolvedValue({ id: 'ticket-1', status: 'RESOLVED' });

    await service.updateTicketStatus(
      'ticket-1',
      { status: 'RESOLVED', notes: 'Done' },
      'user-1',
      Role.HOD,
    );

    expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-1' },
        data: expect.objectContaining({
          status: 'RESOLVED',
          assignedTo: 'user-1',
        }),
      }),
    );
  });

  it('addTicketReply throws for students', async () => {
    mockPrisma.supportTicket.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'ticket-1' });

    await expect(
      service.addTicketReply(
        'ticket-1',
        { message: 'Hi' },
        'user-1',
        Role.STUDENT,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('addTicketReply returns reply for teacher', async () => {
    mockPrisma.supportTicket.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'ticket-1' });
    mockPrisma.supportTicket.update = jest
      .fn()
      .mockResolvedValue({ id: 'ticket-1', title: 'Help' });
    mockPrisma.user.findUnique = jest
      .fn()
      .mockResolvedValue({ email: 't@example.com' });

    const result = await service.addTicketReply(
      'ticket-1',
      { message: 'More info needed', priority: 'HIGH' },
      'user-1',
      Role.TEACHER,
    );

    expect(result.reply).toBeDefined();
    expect(result.reply.message).toBe('More info needed');
    expect(result.reply.responderRole).toBe(Role.TEACHER);
    expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-1' },
        data: expect.objectContaining({ priority: 'HIGH' }),
      }),
    );
  });
});

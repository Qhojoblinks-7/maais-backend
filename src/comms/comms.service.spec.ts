import { Test, TestingModule } from '@nestjs/testing';
import { CommsService } from './comms.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('CommsService (Support Tickets)', () => {
  let service: CommsService;
  let prisma: PrismaService;

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
      ],
    }).compile();

    service = module.get<CommsService>(CommsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('createTicket throws when requester is not a student', async () => {
    mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'user-1',
      studentProfile: null,
    });

    await expect(
      service.createTicket(
        {
          title: 'Test',
          description: 'Desc',
          category: 'General',
          priority: 'MEDIUM',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
    expect(mockPrisma.supportTicket.create).toHaveBeenCalled();
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
      undefined,
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
        where: {
          studentId: { in: ['student-1', 'student-2'] },
          category: 'General',
        },
      }),
      undefined,
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
        data: {
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
          assignedTo: 'user-1',
        },
      }),
      undefined,
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
        data: { priority: 'HIGH' },
      }),
      undefined,
    );
  });
});

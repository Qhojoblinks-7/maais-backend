import {
  Injectable,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

export interface CreateStaffDto {
  email: string;
  password: string;
  role: Role;
  staffId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: Gender;
  phone?: string;
  departmentId?: string;
}

export interface CreateStudentDto {
  email?: string;
  password: string;
  indexNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: Gender;
  dateOfBirth?: string;
  currentClassId?: string;
  departmentId?: string;
  parentFirstName?: string;
  parentLastName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentRelationship?: string;
}

export interface CreateParentDto {
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone: string;
  occupation?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createStaff(dto: CreateStaffDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        staffProfile: {
          create: {
            staffId: dto.staffId,
            firstName: dto.firstName,
            lastName: dto.lastName,
            middleName: dto.middleName,
            gender: dto.gender,
            phone: dto.phone,
            departmentId: dto.departmentId,
          },
        },
      },
      include: { staffProfile: true },
    });
  }

  async createStudent(dto: CreateStudentDto) {
    const indexExists = await this.prisma.studentProfile.findUnique({
      where: { indexNumber: dto.indexNumber },
    });
    if (indexExists)
      throw new ConflictException(
        `Index number ${dto.indexNumber} already registered`,
      );

    const passwordHash = await argon2.hash(dto.password);
    const email = dto.email ?? `${dto.indexNumber}@student.mandoshts.edu.gh`;

    const student = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            indexNumber: dto.indexNumber,
            firstName: dto.firstName,
            lastName: dto.lastName,
            middleName: dto.middleName,
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            currentClassId: dto.currentClassId,
            departmentId: dto.departmentId,
          },
        },
      },
      include: {
        studentProfile: { include: { currentClass: true, department: true } },
      },
    });

    // Handle parent creation if info provided
    if (dto.parentFirstName && dto.parentLastName && dto.parentPhone) {
      const parentEmail = dto.parentEmail || `${dto.parentPhone}@parent.com`;
      let parentUser = await this.prisma.user.findUnique({
        where: { email: parentEmail },
        include: { parentProfile: true },
      });

      if (!parentUser) {
        const parentPassHash = await argon2.hash('Parent@123!');
        parentUser = await this.prisma.user.create({
          data: {
            email: parentEmail,
            passwordHash: parentPassHash,
            role: Role.PARENT,
            phone: dto.parentPhone,
            parentProfile: {
              create: {
                firstName: dto.parentFirstName,
                lastName: dto.parentLastName,
                phone: dto.parentPhone,
                email: dto.parentEmail,
              },
            },
          },
          include: { parentProfile: true },
        });
      }

      if (parentUser.parentProfile) {
        await this.prisma.studentParentLink.upsert({
          where: {
            studentId_parentId: {
              studentId: student.studentProfile!.id,
              parentId: parentUser.parentProfile.id,
            },
          },
          create: {
            studentId: student.studentProfile!.id,
            parentId: parentUser.parentProfile.id,
            relationship: dto.parentRelationship || 'Guardian',
            isPrimary: true,
          },
          update: {},
        });
      }
    }

    return student;
  }

  async createParent(dto: CreateParentDto) {
    const email = dto.email || `${dto.phone}@parent.com`;
    const exists = await this.prisma.user.findUnique({
      where: { email },
    });
    if (exists)
      throw new ConflictException('Parent email/phone already in use');

    const passwordHash = await argon2.hash(dto.password || 'Parent@123!');

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.PARENT,
        phone: dto.phone,
        parentProfile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            email: dto.email,
            occupation: dto.occupation,
          },
        },
      },
      include: { parentProfile: true },
    });
  }

  async getAllStudents(user?: { id: string; role: Role }) {
    let departmentId: string | undefined;

    if (user?.role === Role.HOD) {
      const staff = await this.prisma.staffProfile.findUnique({
        where: { userId: user.id },
      });
      departmentId = staff?.departmentId || undefined;
    }

    if (user?.role === Role.TEACHER) {
      const staff = await this.prisma.staffProfile.findUnique({
        where: { userId: user.id },
      });

      if (!staff) {
        throw new Error('Teacher profile not found');
      }

      const teacherAssignments = await this.prisma.teachingAssignment.findMany({
        where: { teacherId: staff.id },
        select: { classSectionId: true },
      });

      const classSectionIds = teacherAssignments.map((a) => a.classSectionId);

      return this.prisma.studentProfile.findMany({
        where: {
          archivedAt: null,
          currentClassId: { in: classSectionIds },
        },
        include: {
          currentClass: true,
          department: true,
          user: { select: { email: true, isActive: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    }

    return this.prisma.studentProfile.findMany({
      where: {
        archivedAt: null,
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        currentClass: true,
        department: true,
        user: { select: { email: true, isActive: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getStudentProfile(
    studentId: string,
    requesterRole?: Role,
    teacherStaffId?: string,
  ) {
    const baseProfile = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      include: {
        currentClass: true,
        department: true,
        user: { select: { email: true, lastLoginAt: true } },
        parentLinks: { include: { parent: true } },
        grades: {
          where: requesterRole === Role.STUDENT ? { isApproved: true } : {},
          include: { subject: true, term: { include: { academicYear: true } } },
          take: 50,
          orderBy: { term: { academicYear: { startDate: 'desc' } } },
        },
        reportCards: {
          include: { term: { include: { academicYear: true } } },
          orderBy: { term: { academicYear: { startDate: 'desc' } } },
        },
      },
    });

    if (requesterRole === Role.TEACHER && teacherStaffId) {
      const isAssigned = await this.prisma.teachingAssignment.findFirst({
        where: {
          teacherId: teacherStaffId,
          classSectionId: baseProfile.currentClassId || '',
        },
      });

      if (!isAssigned) {
        throw new ForbiddenException(
          "You are not assigned to this student's class",
        );
      }
    }

    return baseProfile;
  }

  async getAllStaff(user?: { id: string; role: Role }) {
    let departmentId: string | undefined;

    if (user?.role === Role.HOD) {
      const staff = await this.prisma.staffProfile.findUnique({
        where: { userId: user.id },
      });
      departmentId = staff?.departmentId || undefined;
    }

    return this.prisma.staffProfile.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        user: { select: { email: true, role: true, isActive: true } },
        department: true,
        teachingAssignments: { include: { subject: true, classSection: true } },
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async deactivateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async updateStudentProfile(
    studentId: string,
    dto: {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      bio?: string;
      photoUrl?: string;
      dateOfBirth?: string;
    },
  ) {
    const profile = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      include: { user: true },
    });

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.middleName !== undefined) updateData.middleName = dto.middleName;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.photoUrl !== undefined) updateData.photoUrl = dto.photoUrl;
    if (dto.dateOfBirth !== undefined)
      updateData.dateOfBirth = dto.dateOfBirth
        ? new Date(dto.dateOfBirth)
        : null;

    const updatedProfile = await this.prisma.studentProfile.update({
      where: { id: studentId },
      data: updateData,
      include: {
        currentClass: true,
        department: true,
        user: { select: { email: true, lastLoginAt: true } },
      },
    });

    return updatedProfile;
  }
}

import {
  Injectable,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

// Student accounts always use a strict, deterministic email derived from the
// index number. This guarantees a 1:1 mapping (index → email) and removes any
// free-text email input that could be abused.
export const STUDENT_EMAIL_DOMAIN = 'st.mandoshts.edu.gh';

// Default password assigned to students on creation. They are forced to change
// it on first login (User.mustChangePassword is set true by the schema default).
export const DEFAULT_STUDENT_PASSWORD = 'Student@2024!';

/**
 * Student index numbers must be plain identifiers (e.g. "MSHTS/2024/001" or a
 * WAEC-style number). We reject anything containing characters that are used in
 * SQL / shell / markup injection so a malicious value can never reach a query
 * or be rendered unsafely. Everything is still passed through Prisma's
 * parameterized queries, but defense-in-depth starts at the boundary.
 */
const INDEX_NUMBER_PATTERN = /^[A-Za-z0-9/_.\- ]{2,40}$/;

function sanitizeText(value: unknown, maxLength = 120): string {
  if (value == null) return '';
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, '') // strip control chars
    .replace(/[<>"'`;\\]/g, '') // strip common injection metacharacters
    .trim()
    .slice(0, maxLength);
}

function sanitizeIndexNumber(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) throw new ForbiddenException('Index number is required');
  if (!INDEX_NUMBER_PATTERN.test(raw)) {
    throw new ForbiddenException(
      'Index number contains invalid characters or is too long',
    );
  }
  return raw;
}

function deriveStudentEmail(indexNumber: string): string {
  // Use the raw index number as the local part; the domain is fixed and never
  // influenced by user input.
  return `${indexNumber}@${STUDENT_EMAIL_DOMAIN}`;
}

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

export interface UpdateStaffDto {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  staffId?: string;
  departmentId?: string;
  gender?: Gender;
  email?: string;
  role?: Role;
  isActive?: boolean;
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

  async updateStaff(staffId: string, dto: UpdateStaffDto) {
    const staffProfile = await this.prisma.staffProfile.findFirst({
      where: { OR: [{ id: staffId }, { userId: staffId }] },
      include: { user: true },
    });

    if (!staffProfile) throw new Error('Staff profile not found');

    const profileData: any = {};
    if (dto.firstName !== undefined) profileData.firstName = dto.firstName;
    if (dto.lastName !== undefined) profileData.lastName = dto.lastName;
    if (dto.middleName !== undefined) profileData.middleName = dto.middleName;
    if (dto.phone !== undefined) profileData.phone = dto.phone;
    if (dto.staffId !== undefined) profileData.staffId = dto.staffId;
    if (dto.departmentId !== undefined) profileData.departmentId = dto.departmentId;
    if (dto.gender !== undefined) profileData.gender = dto.gender;

    if (Object.keys(profileData).length > 0) {
      await this.prisma.staffProfile.update({
        where: { id: staffProfile.id },
        data: profileData,
      });
    }

    const userData: any = {};
    if (dto.email !== undefined) userData.email = dto.email;
    if (dto.role !== undefined) userData.role = dto.role;
    if (dto.isActive !== undefined) userData.isActive = dto.isActive;

    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({
        where: { id: staffProfile.userId },
        data: userData,
      });
    }

    return this.prisma.staffProfile.findUnique({
      where: { id: staffProfile.id },
      include: {
        user: { select: { email: true, role: true, isActive: true } },
        department: true,
      },
    });
  }

  async createStudent(dto: CreateStudentDto) {
    const indexNumber = sanitizeIndexNumber(dto.indexNumber);

    const indexExists = await this.prisma.studentProfile.findUnique({
      where: { indexNumber },
    });
    if (indexExists)
      throw new ConflictException(
        `Index number ${indexNumber} already registered`,
      );

    const passwordHash = await argon2.hash(
      dto.password || DEFAULT_STUDENT_PASSWORD,
    );

    // Email is ALWAYS derived from the index number. Any client-supplied email
    // is ignored so it can never be spoofed or used to inject data.
    const email = deriveStudentEmail(indexNumber);

    const student = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.STUDENT,
        mustChangePassword: true,
        studentProfile: {
          create: {
            indexNumber,
            firstName: sanitizeText(dto.firstName),
            lastName: sanitizeText(dto.lastName),
            middleName: sanitizeText(dto.middleName),
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

    // Parent contact info is stored in student profile only; no separate parent user accounts
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

  async getAllStudents(user?: { id: string; role: Role }, search?: string) {
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

      const where: any = {
        archivedAt: null,
        currentClassId: { in: classSectionIds },
      };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { indexNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      return this.prisma.studentProfile.findMany({
        where,
        include: {
          currentClass: true,
          department: true,
          user: {
            select: {
              email: true,
              phone: true,
              isActive: true,
              role: true,
              lastLoginAt: true,
            },
          },
          parentLinks: { take: 1, include: { parent: true } },
          grades: { take: 20, include: { subject: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    }

    const where: any = {
      archivedAt: null,
      ...(departmentId ? { departmentId } : {}),
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { indexNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.studentProfile.findMany({
      where,
      include: {
        currentClass: true,
        department: true,
        user: {
          select: {
            email: true,
            phone: true,
            isActive: true,
            role: true,
            lastLoginAt: true,
          },
        },
        parentLinks: { take: 1, include: { parent: true } },
        grades: { take: 20, include: { subject: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getStudentCount() {
    return this.prisma.studentProfile.count({
      where: { archivedAt: null },
    });
  }

  async getStaffCount() {
    return this.prisma.staffProfile.count();
  }

  async getStudentBoarderStats() {
    const [boarders, dayStudents] = await Promise.all([
      this.prisma.studentProfile.count({
        where: { archivedAt: null, isBoarder: true },
      }),
      this.prisma.studentProfile.count({
        where: { archivedAt: null, isBoarder: false },
      }),
    ]);
    return { boarders, dayStudents, total: boarders + dayStudents };
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

  async searchTeachers(user?: { id: string; role: Role }, search?: string) {
    let departmentId: string | undefined;

    if (user?.role === Role.HOD) {
      const staff = await this.prisma.staffProfile.findUnique({
        where: { userId: user.id },
      });
      departmentId = staff?.departmentId || undefined;
    }

    const where: any = {
      user: { role: Role.TEACHER },
      ...(departmentId ? { departmentId } : {}),
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { staffId: { contains: search, mode: 'insensitive' } },
      ];
    }

    let results = await this.prisma.staffProfile.findMany({
      where,
      include: {
        user: { select: { email: true, role: true, isActive: true } },
        department: true,
        teachingAssignments: { include: { subject: true, classSection: true } },
      },
      orderBy: { lastName: 'asc' },
      take: 20,
    });

    if (user?.role === Role.TEACHER) {
      const requesterStaff = await this.prisma.staffProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (requesterStaff) {
        results = results.filter((s) => s.id === requesterStaff.id);
      }
    }

    return results;
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
      photoUrl?: string;
      dateOfBirth?: string;
    },
  ) {
    await this.prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      include: { user: true },
    });

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.middleName !== undefined) updateData.middleName = dto.middleName;
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

  async getAllParents() {
    const parents = await this.prisma.parentProfile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        occupation: true,
        user: {
          select: {
            email: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        studentLinks: {
          select: {
            relationship: true,
            isPrimary: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                currentClass: {
                  select: {
                    id: true,
                    name: true,
                    level: true,
                  },
                },
                user: {
                  select: {
                    email: true,
                  },
                },
                grades: {
                  include: {
                    subject: true,
                    term: {
                      include: {
                        academicYear: true,
                      },
                    },
                  },
                  take: 50,
                  orderBy: {
                    term: {
                      academicYear: {
                        startDate: 'desc',
                      },
                    },
                  },
                },
                attendance: {
                  include: {
                    term: true,
                  },
                  take: 10,
                  orderBy: {
                    term: {
                      academicYear: {
                        startDate: 'desc',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return (parents as any).map((p) => {
      const fullName = `${p.firstName} ${p.lastName}`;
      const wards = p.studentLinks.map((link) => {
        const student = link.student;
        const grades = student.grades || [];
        const totalScore = grades.reduce(
          (sum, g) => sum + (g.totalScore || 0),
          0,
        );
        const averageScore = grades.length
          ? Math.round((totalScore / grades.length) * 10) / 10
          : 0;

        const attendance = student.attendance || [];
        const latestAttendance = attendance[0];
        const attendancePct =
          latestAttendance && latestAttendance.totalDays
            ? Math.round(
                (latestAttendance.daysPresent / latestAttendance.totalDays) *
                  100,
              )
            : 0;

        return {
          id: student.id,
          name:
            `${student.firstName || ''} ${student.lastName || ''}`.trim() ||
            student.user?.email ||
            student.id,
          averageScore,
          attendance: attendancePct,
          feesStatus: 'Paid',
          balance: 0,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
        };
      });

      return {
        id: p.id,
        name: fullName,
        phone: p.phone,
        email: p.email,
        occupation: p.occupation,
        wards,
        appAdopted: !!p.user.lastLoginAt,
        accessCode: `A-${p.id.slice(0, 4).toUpperCase()}`,
        isPTAExecutive: false,
        ptaRole: null,
        lastContacted: null,
        lastMessage: null,
        communicationLogs: [],
      };
    });
  }

  async searchParents(user?: { id: string; role: Role }, search?: string) {
    let departmentId: string | undefined;

    if (user?.role === Role.HOD) {
      const staff = await this.prisma.staffProfile.findUnique({
        where: { userId: user.id },
      });
      departmentId = staff?.departmentId || undefined;
    }

    const where: any = {};

    if (departmentId) {
      where.studentLinks = {
        some: {
          student: {
            currentClass: { departmentId },
          },
        },
      };
    }

    const parents = await this.prisma.parentProfile.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        user: {
          select: {
            email: true,
            isActive: true,
          },
        },
      },
      orderBy: { lastName: 'asc' },
      take: 20,
    });

    if (!search) return parents;

    const q = search.toLowerCase();
    return parents.filter((p) => {
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (p.phone || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    });
  }

  async getStaffProfile(
    staffId: string,
    requester: { id: string; role: Role },
  ) {
    const staffProfile = await this.prisma.staffProfile.findFirst({
      where: { OR: [{ id: staffId }, { userId: staffId }] },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        department: true,
        teachingAssignments: {
          include: { subject: true, classSection: true },
        },
      },
    });

    if (!staffProfile) {
      throw new Error('Staff profile not found');
    }

    if (requester.role === Role.TEACHER) {
      const requesterStaff = await this.prisma.staffProfile.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      if (!requesterStaff || requesterStaff.id !== staffProfile.id) {
        throw new Error('You do not have access to this staff profile');
      }
    }

    return staffProfile;
  }

  async bulkImportStaff(staffList: any[]) {
    const results = { success: 0, failed: 0, errors: [] };

    for (const s of staffList) {
      try {
        const dto: CreateStaffDto = {
          email: s.email,
          password: s.password || 'Staff@2024!',
          role: s.role || Role.TEACHER,
          staffId: s.staffId || `STF-${Date.now()}-${results.success + results.failed}`,
          firstName: s.firstName,
          lastName: s.lastName,
          middleName: s.middleName,
          gender: (s.gender || 'MALE').toUpperCase(),
          phone: s.phone,
          departmentId: s.departmentId,
        };
        await this.createStaff(dto);
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          staffId: s.staffId || s.email || 'unknown',
          error: err.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  async batchImportStudents(students: any[]) {
    const results = { success: 0, failed: 0, errors: [] };

    for (const s of students) {
      try {
        const dto = {
          indexNumber: s.indexNumber || s.index_number,
          firstName: s.firstName || s.first_name,
          lastName: s.lastName || s.last_name,
          middleName: s.middleName || s.middle_name,
          gender: (s.gender || 'MALE').toUpperCase(),
          dateOfBirth: s.dateOfBirth || s.date_of_birth || s.dob,
          email: s.email,
          password: s.password || 'Student@123!',
        };

        await this.createStudent(dto);
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          indexNumber: s.indexNumber,
          error: err.message || 'Unknown error',
        });
      }
    }

    return results;
  }
}

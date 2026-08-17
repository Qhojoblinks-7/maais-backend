import {
  Injectable,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, Gender, ClassLevel } from '@prisma/client';
import * as argon2 from 'argon2';

// Student accounts always use a strict, deterministic email derived from the
// index number. This guarantees a 1:1 mapping (index → email) and removes any
// free-text email input that could be abused.
export const STUDENT_EMAIL_DOMAIN = 'st.mandoshts.edu.gh';

// Default password assigned to students on creation. They are forced to change
// it on first login (User.mustChangePassword is set true by the schema default).
export const DEFAULT_STUDENT_PASSWORD = 'Student@123!';
export const DEFAULT_STAFF_PASSWORD = 'Staff@123!';

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

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export interface CreateStaffDto {
  email: string;
  password: string;
  role: Role;
  staffId?: string;
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
  isHod?: boolean;
  hodDepartmentId?: string;
  canTeach?: boolean;
  canOversight?: boolean;
}

export interface CreateStudentDto {
  email?: string;
  password: string;
  indexNumber?: string;
  nationalId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: Gender;
  dateOfBirth?: string;
  subjects?: any;
  currentClassId?: string;
  departmentId?: string;
  parentFirstName?: string;
  parentMiddleName?: string;
  parentLastName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentRelationship?: string;
  isBoarder?: boolean;
}

export interface CreateParentDto {
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone: string;
  occupation?: string;
  studentIds?: string[];
}



@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createStaff(dto: CreateStaffDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(
      dto.password || DEFAULT_STAFF_PASSWORD,
    );

    const resolvedStaffId = dto.staffId || await this.generateStaffId(dto.role, dto.departmentId);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        mustChangePassword: true,
        staffProfile: {
          create: {
            staffId: resolvedStaffId,
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
    if (dto.departmentId !== undefined)
      profileData.departmentId = dto.departmentId;
    if (dto.gender !== undefined) profileData.gender = dto.gender;
    if (dto.isHod !== undefined) profileData.isHod = dto.isHod;
    if (dto.hodDepartmentId !== undefined)
      profileData.hodDepartmentId = dto.hodDepartmentId || null;
    if (dto.canTeach !== undefined) profileData.canTeach = dto.canTeach;
    if (dto.canOversight !== undefined)
      profileData.canOversight = dto.canOversight;

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


  private async resolveDepartmentCode(departmentId: string | undefined): Promise<string> {
    if (!departmentId) return 'GEN';
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { code: true },
    });
    return dept?.code || 'GEN';
  }

  private async generateIndexNumber(prefix: string, year: number): Promise<string> {
    const seq = await this.prisma.indexNumberSequence.upsert({
      where: { prefix_year: { prefix, year } },
      update: { lastSeq: { increment: 1 } },
      create: { prefix, year, lastSeq: 1 },
    });

    return `${prefix}${year}${String(seq.lastSeq).padStart(3, '0')}`;
  }

  private static readonly STAFF_ID_PREFIXES: Record<string, string> = {
    SUPER_ADMIN: 'ADM',
    HEADMASTER: 'HDM',
    ASSISTANT_HEAD_ADMINISTRATION: 'AHA',
    ASSISTANT_HEAD_DOMESTIC: 'AHD',
    HOD: 'HOD',
    TEACHER: 'TCH',
    STUDENT: 'STF',
    PARENT: 'PAR',
  };

  private async generateStaffId(role: string, departmentId?: string): Promise<string> {
    const prefix = UsersService.STAFF_ID_PREFIXES[role] || 'STF';
    const year = new Date().getFullYear();
    const yy = String(year).slice(-2);

    const isDeptIndependent = role === 'ASSISTANT_HEAD_ADMINISTRATION' || role === 'ASSISTANT_HEAD_DOMESTIC';

    let deptCode = '00';
    if (departmentId && !isDeptIndependent) {
      const dept = await this.prisma.department.findUnique({
        where: { id: departmentId },
        select: { code: true },
      });
      if (dept?.code) {
        deptCode = dept.code.slice(0, 2).toUpperCase().padEnd(2, '0');
      }
    }

    const seq = await this.prisma.staffIdSequence.upsert({
      where: { prefix_year_deptCode: { prefix, year, deptCode } },
      update: { lastSeq: { increment: 1 } },
      create: { prefix, year, deptCode, lastSeq: 1 },
    });

    return `${prefix}${yy}${deptCode}${String(seq.lastSeq).padStart(3, '0')}`;
  }

  async createStudent(dto: CreateStudentDto) {
    const deptCode = await this.resolveDepartmentCode(dto.departmentId);
    const admissionYear = new Date().getFullYear();

    const indexNumber = dto.indexNumber && dto.indexNumber.trim()
      ? sanitizeIndexNumber(dto.indexNumber)
      : await this.generateIndexNumber(deptCode, admissionYear);

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
            nationalId: dto.nationalId,
            firstName: sanitizeText(dto.firstName),
            lastName: sanitizeText(dto.lastName),
            middleName: sanitizeText(dto.middleName),
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            subjects: dto.subjects,
            currentClassId: dto.currentClassId,
            departmentId: dto.departmentId,
            isBoarder: dto.isBoarder ?? false,
          },
        },
      },
      include: {
        studentProfile: { include: { currentClass: true, department: true } },
      },
    });

    if (dto.parentPhone || dto.parentEmail) {
      const parentPhone = dto.parentPhone || '';
      const parentEmail = dto.parentEmail || `${parentPhone}@parent.com`;

      let parent = await this.prisma.user.findFirst({
        where: {
          OR: [{ phone: parentPhone }, { email: parentEmail }],
          role: Role.PARENT,
        },
        include: { parentProfile: true },
      });

      if (!parent) {
        const passwordHash = await argon2.hash('Parent@123!');
        parent = await this.prisma.user.create({
          data: {
            email: parentEmail,
            passwordHash,
            role: Role.PARENT,
            phone: parentPhone || null,
            mustChangePassword: true,
            parentProfile: {
              create: {
                firstName: sanitizeText(dto.parentFirstName || ''),
                middleName: sanitizeText(dto.parentMiddleName || ''),
                lastName: sanitizeText(dto.parentLastName || ''),
                phone: parentPhone,
                email: parentEmail,
                occupation: null,
              },
            },
          },
          include: { parentProfile: true },
        });
      }

      await this.prisma.studentParentLink.create({
        data: {
          studentId: student.studentProfile.id,
          parentId: parent.parentProfile!.id,
          relationship: dto.parentRelationship || 'Guardian',
          isPrimary: true,
        },
      });
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

    const parent = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.PARENT,
        phone: dto.phone,
        mustChangePassword: true,
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

    if (dto.studentIds?.length) {
      const links = dto.studentIds.map((studentId) => ({
        studentId,
        parentId: parent.parentProfile!.id,
        relationship: 'Guardian',
        isPrimary: true,
      }));
      await this.prisma.studentParentLink.createMany({ data: links });
    }

    return parent;
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
    const result = await this.prisma.$queryRaw<
      { boarders: number; day_students: number }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE "isBoarder" = true) AS boarders,
        COUNT(*) FILTER (WHERE "isBoarder" = false OR "isBoarder" IS NULL) AS day_students
      FROM "student_profiles"
      WHERE "archivedAt" IS NULL
    `;

    const boarders = Number(result[0]?.boarders ?? 0);
    const dayStudents = Number(result[0]?.day_students ?? 0);
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
      departmentId = staff?.departmentId || staff?.hodDepartmentId || undefined;
    }

    return this.prisma.staffProfile.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        user: { select: { email: true, role: true, isActive: true } },
        department: true,
        hodDepartment: true,
        teachingAssignments: { include: { subject: true, classSection: true } },
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async getMyContext(user: { id: string; role: Role }) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { userId: user.id },
      include: {
        department: true,
        hodDepartment: true,
        teachingAssignments: { include: { subject: true, classSection: true } },
      },
    });

    if (!profile) {
      return {
        role: user.role,
        department: null,
        hodDepartment: null,
        teachingAssignments: [],
        canTeach: false,
        canOversight: false,
        isHod: false,
        activeMode: 'teaching',
      };
    }

    const canTeach = profile.canTeach ?? true;
    const canOversight =
      profile.canOversight || profile.hodDepartmentId != null;
    const isHod = profile.isHod || false;

    return {
      role: user.role,
      department: profile.department,
      hodDepartment: profile.hodDepartment,
      teachingAssignments: profile.teachingAssignments,
      canTeach,
      canOversight,
      isHod,
      activeMode:
        canTeach && canOversight
          ? 'dual'
          : canOversight
            ? 'oversight'
            : 'teaching',
    };
  }

  async searchTeachers(user?: { id: string; role: Role }, search?: string) {
    let departmentId: string | undefined;

    if (
      user?.role === Role.HOD ||
      user?.role === Role.HEADMASTER ||
      user?.role === Role.SUPER_ADMIN
    ) {
      const staff = await this.prisma.staffProfile.findUnique({
        where: { userId: user.id },
      });
      departmentId = staff?.departmentId || staff?.hodDepartmentId || undefined;
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
          student: { departmentId },
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
        hodDepartment: true,
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

    if (!staffList.length) return results;

    const uniqueDeptNames = Array.from(
      new Set(
        staffList
          .map((s) => (s.departmentName || s.department || '').trim())
          .filter(Boolean),
      ),
    );

    const departments = await this.prisma.department.findMany({
      where: {
        name: {
          in: uniqueDeptNames,
          mode: 'insensitive',
        },
      },
      select: { id: true, name: true },
    });

    const deptMap = new Map(
      departments.map((d) => [d.name.toLowerCase(), d.id]),
    );

    const emails = staffList
      .map((s) => s.email)
      .filter(Boolean)
      .map((e) => e.toLowerCase().trim());

    const existingUsers = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });

    const existingEmailSet = new Set(
      existingUsers.map((u) => u.email.toLowerCase()),
    );

    const passwordPromises = staffList.map((s) =>
      argon2.hash(s.password || DEFAULT_STAFF_PASSWORD).catch((err) => {
        throw new Error(`Password hash failed for ${s.email || s.staffId}: ${err.message}`);
      }),
    );

    const passwordHashes = await Promise.all(passwordPromises);

    const BATCH_SIZE = 20;

    for (let i = 0; i < staffList.length; i += BATCH_SIZE) {
      const batch = staffList.slice(i, i + BATCH_SIZE);

      const createPromises = batch.map(async (s, idx) => {
        const globalIdx = i + idx;
        try {
          const email = (s.email || '').toLowerCase().trim();
          if (!email) {
            throw new Error('Missing email');
          }
          if (existingEmailSet.has(email)) {
            throw new Error('Email already exists');
          }

          const departmentName = (s.departmentName || s.department || '').trim();
          const departmentId = departmentName
            ? deptMap.get(departmentName.toLowerCase()) || undefined
            : undefined;

          const role = (s.role || 'TEACHER').toString().toUpperCase();
          const validRole = ['TEACHER', 'HOD', 'HEADMASTER', 'SUPER_ADMIN', 'ASSISTANT_HEAD_ADMINISTRATION', 'ASSISTANT_HEAD_DOMESTIC'].includes(role)
            ? role
            : Role.TEACHER;

          const passwordHash = passwordHashes[globalIdx];
          const resolvedStaffId = s.staffId || await this.generateStaffId(validRole, departmentId);

          await this.prisma.user.create({
            data: {
              email,
              passwordHash,
              role: validRole,
              mustChangePassword: true,
              staffProfile: {
                create: {
                  staffId: resolvedStaffId,
                  firstName: s.firstName || '',
                  lastName: s.lastName || '',
                  middleName: s.middleName,
                  gender: (s.gender || 'MALE').toUpperCase(),
                  phone: s.phone || '',
                  departmentId,
                },
              },
            },
          });

          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push({
            staffId: s.staffId || s.email || `row-${globalIdx + 1}`,
            error: err.message || 'Unknown error',
          });
        }
      });

      await Promise.all(createPromises);
    }

    return results;
  }

  async batchImportStudents(students: any[]) {
    const results = { success: 0, failed: 0, errors: [], warnings: [] };
    if (!students.length) return results;

    // Deduplicate input by student identity to prevent the same student
    // being created multiple times when a CSV has repeated rows (e.g. one
    // row per subject instead of one row per student).
    // Primary key: indexNumber (CassRefID). Fallback: name + phone + dob.
    const seenIndexNumbers = new Set<string>();
    const seenStudents = new Set<string>();
    const dedupedStudents: any[] = [];
    for (const s of students) {
      const indexNumber = (s.indexNumber || s.index_number || '').trim();
      if (indexNumber) {
        if (seenIndexNumbers.has(indexNumber)) {
          results.warnings.push({
            indexNumber,
            className: s.className || s.class_name || 'unknown',
            message: `Duplicate student skipped: ${indexNumber}`,
          });
          continue;
        }
        seenIndexNumbers.add(indexNumber);
        dedupedStudents.push(s);
        continue;
      }

      const firstName = (s.firstName || s.first_name || '').trim().toLowerCase();
      const lastName = (s.lastName || s.last_name || '').trim().toLowerCase();
      const phone = (s.parentPhone || s.parent_phone || '').trim().toLowerCase();
      const dob = (s.dateOfBirth || s.date_of_birth || s.dob || '').trim().toLowerCase();
      const dedupeKey = `${firstName}|${lastName}|${phone}|${dob}`;
      if (seenStudents.has(dedupeKey)) {
        results.warnings.push({
          indexNumber: 'unknown',
          className: s.className || s.class_name || 'unknown',
          message: `Duplicate student skipped: ${firstName} ${lastName}`,
        });
        continue;
      }
      seenStudents.add(dedupeKey);
      dedupedStudents.push(s);
    }
    const activeStudents = dedupedStudents;

    const [allClasses, allDepts, existingIndexRows] = await Promise.all([
      this.prisma.classSection.findMany({ select: { id: true, name: true, level: true, program: true } }),
      this.prisma.department.findMany({ select: { id: true, name: true, code: true } }),
      this.prisma.studentProfile.findMany({
        where: { indexNumber: { in: activeStudents.map(s => s.indexNumber || s.index_number).filter((v): v is string => Boolean(v)) } },
        select: { indexNumber: true },
      }),
    ]);

    const classByName = new Map(allClasses.map(c => [c.name.toLowerCase(), c.id]));
    const classByLevelProgram = new Map(allClasses.map(c => [`${c.level}|${(c.program || '').toLowerCase()}`, c.id]));
    const deptByName = new Map(allDepts.map(d => [d.name.toLowerCase(), d.id]));
    const deptCodeById = new Map(allDepts.map(d => [d.id, d.code || 'GEN']));
    const existingIndexSet = new Set(existingIndexRows.map(s => s.indexNumber));

    const BATCH_SIZE = 20;

    const passwordCache = new Map<string, string>();

    const getPasswordHash = async (pwd: string) => {
      if (passwordCache.has(pwd)) return passwordCache.get(pwd)!;
      const hash = await argon2.hash(pwd);
      passwordCache.set(pwd, hash);
      return hash;
    };

    for (let i = 0; i < activeStudents.length; i += BATCH_SIZE) {
      const batch = activeStudents.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (s, idx) => {
        const globalIdx = i + idx;
        try {
          const rowLabel = `row ${globalIdx + 1}`;
          let currentClassId = s.currentClassId || s.currentclassid;
          let departmentId = s.departmentId || s.departmentid;
          let usedFallbackClass = false;

          const rawClassName = (s.className || s.class_name || s.cassyear || '').trim();
          const csspsDeptName = (s.departmentName || s.department_name || s.programname || '').trim();

          const missing = [];
          if (!(s.firstName || s.first_name)) missing.push('firstName');
          if (!(s.lastName || s.last_name)) missing.push('lastName');
          if (!s.gender) missing.push('gender');
          if (missing.length) throw new Error(`Missing required fields in ${rowLabel}: ${missing.join(', ')}`);

          if (!currentClassId && rawClassName) {
            const aliases = [rawClassName.toLowerCase()];
            if (/^year\s+\d+$/i.test(rawClassName)) aliases.push(rawClassName.replace(/^year\s+/i, 'Form ').toLowerCase());
            if (/^form\s+\d+$/i.test(rawClassName)) aliases.push(rawClassName.replace(/^form\s+/i, 'Year ').toLowerCase());

            for (const alias of aliases) {
              const found = classByName.get(alias);
              if (found) { currentClassId = found; break; }
            }

            if (!currentClassId) {
              const levelMatch = rawClassName.match(/year\s*(\d)|form\s*(\d)/i);
              if (levelMatch) {
                const levelNum = levelMatch[1] || levelMatch[2];
                const levelMap: Record<string, ClassLevel> = { '1': 'FORM_1', '2': 'FORM_2', '3': 'FORM_3' };
                const targetLevel = levelMap[levelNum] as ClassLevel | undefined;
                if (targetLevel) {
                  const programForClass = csspsDeptName || 'General';
                  const fallbackKey = `${targetLevel}|${programForClass.toLowerCase()}`;
                  const fallback = classByLevelProgram.get(fallbackKey);
                  if (fallback) {
                    currentClassId = fallback;
                    usedFallbackClass = true;
                  } else {
                    const newClass = await this.prisma.classSection.upsert({
                      where: { name_level: { name: `Form ${levelNum} ${programForClass}`, level: targetLevel } },
                      update: {},
                      create: { name: `Form ${levelNum} ${programForClass}`, level: targetLevel, program: programForClass, capacity: 40 },
                    });
                    currentClassId = newClass.id;
                    classByLevelProgram.set(fallbackKey, newClass.id);
                    classByName.set(newClass.name.toLowerCase(), newClass.id);
                    usedFallbackClass = true;
                  }
                }
              }
            }
          }

          if (!currentClassId) throw new Error(`Could not resolve class for ${rowLabel}`);

          if (usedFallbackClass) {
            results.warnings.push({
              indexNumber: s.indexNumber || s.index_number || 'unknown',
              className: rawClassName || 'unknown',
              message: `Assigned to fallback class (original: "${rawClassName || 'none'}")`,
            });
          }

          if (!departmentId && csspsDeptName) {
            const deptId = deptByName.get(csspsDeptName.toLowerCase());
            if (deptId) departmentId = deptId;
          }

          const rawIndex = s.indexNumber || s.index_number;
          const indexNumber = rawIndex ? sanitizeIndexNumber(rawIndex) : undefined;
          if (!indexNumber) {
            const deptCode = departmentId ? (deptCodeById.get(departmentId) || 'GEN') : 'GEN';
            const admissionYear = 2025;
            const compositeKey = `${deptCode}${admissionYear}`;

            const seq = await this.prisma.indexNumberSequence.upsert({
              where: { prefix_year: { prefix: deptCode, year: admissionYear } },
              update: { lastSeq: { increment: 1 } },
              create: { prefix: deptCode, year: admissionYear, lastSeq: 1 },
            });
            s.__generatedIndex = `${deptCode}${admissionYear}${String(seq.lastSeq).padStart(3, '0')}`;
          } else {
            s.__generatedIndex = indexNumber;
          }

          if (existingIndexSet.has(s.__generatedIndex)) {
            throw new Error(`Student with index number ${s.__generatedIndex} already exists`);
          }
          existingIndexSet.add(s.__generatedIndex);

          const passwordHash = await getPasswordHash('Student@123!');
          const email = deriveStudentEmail(s.__generatedIndex);

          const gender = (s.gender || 'MALE').toUpperCase();

          const student = await this.prisma.user.create({
            data: {
              email,
              passwordHash,
              role: Role.STUDENT,
              mustChangePassword: true,
              studentProfile: {
                create: {
                  indexNumber: s.__generatedIndex,
                  nationalId: s.nationalId || s.nationalid || s.natid,
                  firstName: sanitizeText(s.firstName || s.first_name),
                  lastName: sanitizeText(s.lastName || s.last_name),
                  middleName: sanitizeText(s.middleName || s.middle_name),
                  gender,
                  dateOfBirth: s.dateOfBirth || s.date_of_birth || s.dob ? new Date(s.dateOfBirth || s.date_of_birth || s.dob) : null,
                  subjects: s.subjects || s.subject_list,
                  currentClassId,
                  departmentId,
                  isBoarder: s.isBoarder != null ? s.isBoarder : s.residential_status === 'BOARDING' || s.boarding === 'true',
                },
              },
            },
            include: { studentProfile: { include: { currentClass: true, department: true } } },
          });

          const disability = (s.disability || s.disability_type || '').trim();
          const canReadBraille = s.canReadBraille != null ? s.canReadBraille : s.can_read_braille === 'true' || s.canreadbraille === 'true';
          const hasMedicalFlag = (disability && !['NORMAL', 'NONE', ''].includes(disability.toUpperCase())) || canReadBraille === true;

          if (hasMedicalFlag) {
            try {
              await this.prisma.medicalRecord.create({
                data: {
                  studentId: student.studentProfile.id,
                  condition: 'CSSPS Import',
                  disability: hasMedicalFlag && disability ? disability : null,
                  canReadBraille: canReadBraille ?? false,
                  status: 'ACTIVE',
                },
              });
            } catch (e: any) {
              if (e?.message?.includes('disability') || e?.message?.includes('column') || e?.message?.includes('does not exist')) {
                await this.prisma.$executeRaw`ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "disability" TEXT, ADD COLUMN IF NOT EXISTS "canReadBraille" BOOLEAN`;
                await this.prisma.medicalRecord.create({
                  data: {
                    studentId: student.studentProfile.id,
                    condition: 'CSSPS Import',
                    disability: hasMedicalFlag && disability ? disability : null,
                    canReadBraille: canReadBraille ?? false,
                    status: 'ACTIVE',
                  },
                });
              } else {
                throw e;
              }
            }
          }

          if (s.parentPhone || s.parentEmail) {
            const parentPhone = s.parentPhone || '';
            const parentEmail = s.parentEmail || `${parentPhone}@parent.com`;

            let parent: any = await this.prisma.user.findFirst({
              where: { OR: [{ phone: parentPhone }, { email: parentEmail }], role: Role.PARENT },
            });

            if (!parent) {
              const parentHash = await argon2.hash('Parent@123!');
              parent = await this.prisma.user.create({
                data: {
                  email: parentEmail,
                  passwordHash: parentHash,
                  role: Role.PARENT,
                  phone: parentPhone || null,
                  mustChangePassword: true,
                  parentProfile: {
                    create: {
                      firstName: sanitizeText(s.parentFirstName || s.parent_first_name || ''),
                      middleName: sanitizeText(s.parentMiddleName || s.parent_middle_name || ''),
                      lastName: sanitizeText(s.parentLastName || s.parent_last_name || ''),
                      phone: parentPhone,
                      email: parentEmail,
                      occupation: null,
                    },
                  },
                },
              });
            }

            await this.prisma.studentParentLink.create({
              data: {
                studentId: student.studentProfile.id,
                parentId: parent.id,
                relationship: s.parentRelationship || s.parent_relationship || s.parentRelationship || 'Guardian',
                isPrimary: true,
              },
            });
          }

          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push({
            indexNumber: s.indexNumber || s.index_number || 'unknown',
            error: err.message || 'Unknown error',
          });
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }
}

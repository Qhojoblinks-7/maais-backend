"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = exports.DEFAULT_STAFF_PASSWORD = exports.DEFAULT_STUDENT_PASSWORD = exports.STUDENT_EMAIL_DOMAIN = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
exports.STUDENT_EMAIL_DOMAIN = 'st.mandoshts.edu.gh';
exports.DEFAULT_STUDENT_PASSWORD = 'Student@123!';
exports.DEFAULT_STAFF_PASSWORD = 'Staff@123!';
const INDEX_NUMBER_PATTERN = /^[A-Za-z0-9/_.\- ]{2,40}$/;
function sanitizeText(value, maxLength = 120) {
    if (value == null)
        return '';
    return String(value)
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/[<>"'`;\\]/g, '')
        .trim()
        .slice(0, maxLength);
}
function sanitizeIndexNumber(value) {
    const raw = String(value ?? '').trim();
    if (!raw)
        throw new common_1.ForbiddenException('Index number is required');
    if (!INDEX_NUMBER_PATTERN.test(raw)) {
        throw new common_1.ForbiddenException('Index number contains invalid characters or is too long');
    }
    return raw;
}
function deriveStudentEmail(indexNumber) {
    return `${indexNumber}@${exports.STUDENT_EMAIL_DOMAIN}`;
}
function generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createStaff(dto) {
        const exists = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
        const passwordHash = await argon2.hash(dto.password || exports.DEFAULT_STAFF_PASSWORD);
        return this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                role: dto.role,
                mustChangePassword: true,
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
    async updateStaff(staffId, dto) {
        const staffProfile = await this.prisma.staffProfile.findFirst({
            where: { OR: [{ id: staffId }, { userId: staffId }] },
            include: { user: true },
        });
        if (!staffProfile)
            throw new Error('Staff profile not found');
        const profileData = {};
        if (dto.firstName !== undefined)
            profileData.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            profileData.lastName = dto.lastName;
        if (dto.middleName !== undefined)
            profileData.middleName = dto.middleName;
        if (dto.phone !== undefined)
            profileData.phone = dto.phone;
        if (dto.staffId !== undefined)
            profileData.staffId = dto.staffId;
        if (dto.departmentId !== undefined)
            profileData.departmentId = dto.departmentId;
        if (dto.gender !== undefined)
            profileData.gender = dto.gender;
        if (Object.keys(profileData).length > 0) {
            await this.prisma.staffProfile.update({
                where: { id: staffProfile.id },
                data: profileData,
            });
        }
        const userData = {};
        if (dto.email !== undefined)
            userData.email = dto.email;
        if (dto.role !== undefined)
            userData.role = dto.role;
        if (dto.isActive !== undefined)
            userData.isActive = dto.isActive;
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
    async createStudent(dto) {
        const indexNumber = sanitizeIndexNumber(dto.indexNumber);
        const indexExists = await this.prisma.studentProfile.findUnique({
            where: { indexNumber },
        });
        if (indexExists)
            throw new common_1.ConflictException(`Index number ${indexNumber} already registered`);
        const passwordHash = await argon2.hash(dto.password || exports.DEFAULT_STUDENT_PASSWORD);
        const email = deriveStudentEmail(indexNumber);
        const student = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                role: client_1.Role.STUDENT,
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
                    OR: [
                        { phone: parentPhone },
                        { email: parentEmail },
                    ],
                    role: client_1.Role.PARENT,
                },
                include: { parentProfile: true },
            });
            if (!parent) {
                const passwordHash = await argon2.hash('Parent@123!');
                parent = await this.prisma.user.create({
                    data: {
                        email: parentEmail,
                        passwordHash,
                        role: client_1.Role.PARENT,
                        phone: parentPhone || null,
                        mustChangePassword: true,
                        parentProfile: {
                            create: {
                                firstName: sanitizeText(dto.parentFirstName || ''),
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
                    parentId: parent.parentProfile.id,
                    relationship: dto.parentRelationship || 'Guardian',
                    isPrimary: true,
                },
            });
        }
        return student;
    }
    async createParent(dto) {
        const email = dto.email || `${dto.phone}@parent.com`;
        const exists = await this.prisma.user.findUnique({
            where: { email },
        });
        if (exists)
            throw new common_1.ConflictException('Parent email/phone already in use');
        const passwordHash = await argon2.hash(dto.password || 'Parent@123!');
        const parent = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                role: client_1.Role.PARENT,
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
            const links = dto.studentIds.map(studentId => ({
                studentId,
                parentId: parent.parentProfile.id,
                relationship: 'Guardian',
                isPrimary: true,
            }));
            await this.prisma.studentParentLink.createMany({ data: links });
        }
        return parent;
    }
    async getAllStudents(user, search) {
        let departmentId;
        if (user?.role === client_1.Role.HOD) {
            const staff = await this.prisma.staffProfile.findUnique({
                where: { userId: user.id },
            });
            departmentId = staff?.departmentId || undefined;
        }
        if (user?.role === client_1.Role.TEACHER) {
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
            const where = {
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
        const where = {
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
    async getStudentProfile(studentId, requesterRole, teacherStaffId) {
        const baseProfile = await this.prisma.studentProfile.findUniqueOrThrow({
            where: { id: studentId },
            include: {
                currentClass: true,
                department: true,
                user: { select: { email: true, lastLoginAt: true } },
                parentLinks: { include: { parent: true } },
                grades: {
                    where: requesterRole === client_1.Role.STUDENT ? { isApproved: true } : {},
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
        if (requesterRole === client_1.Role.TEACHER && teacherStaffId) {
            const isAssigned = await this.prisma.teachingAssignment.findFirst({
                where: {
                    teacherId: teacherStaffId,
                    classSectionId: baseProfile.currentClassId || '',
                },
            });
            if (!isAssigned) {
                throw new common_1.ForbiddenException("You are not assigned to this student's class");
            }
        }
        return baseProfile;
    }
    async getAllStaff(user) {
        let departmentId;
        if (user?.role === client_1.Role.HOD) {
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
    async searchTeachers(user, search) {
        let departmentId;
        if (user?.role === client_1.Role.HOD) {
            const staff = await this.prisma.staffProfile.findUnique({
                where: { userId: user.id },
            });
            departmentId = staff?.departmentId || undefined;
        }
        const where = {
            user: { role: client_1.Role.TEACHER },
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
        if (user?.role === client_1.Role.TEACHER) {
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
    async deactivateUser(userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { isActive: false },
        });
    }
    async updateStudentProfile(studentId, dto) {
        await this.prisma.studentProfile.findUniqueOrThrow({
            where: { id: studentId },
            include: { user: true },
        });
        const updateData = {};
        if (dto.firstName !== undefined)
            updateData.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            updateData.lastName = dto.lastName;
        if (dto.middleName !== undefined)
            updateData.middleName = dto.middleName;
        if (dto.photoUrl !== undefined)
            updateData.photoUrl = dto.photoUrl;
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
        return parents.map((p) => {
            const fullName = `${p.firstName} ${p.lastName}`;
            const wards = p.studentLinks.map((link) => {
                const student = link.student;
                const grades = student.grades || [];
                const totalScore = grades.reduce((sum, g) => sum + (g.totalScore || 0), 0);
                const averageScore = grades.length
                    ? Math.round((totalScore / grades.length) * 10) / 10
                    : 0;
                const attendance = student.attendance || [];
                const latestAttendance = attendance[0];
                const attendancePct = latestAttendance && latestAttendance.totalDays
                    ? Math.round((latestAttendance.daysPresent / latestAttendance.totalDays) *
                        100)
                    : 0;
                return {
                    id: student.id,
                    name: `${student.firstName || ''} ${student.lastName || ''}`.trim() ||
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
    async searchParents(user, search) {
        let departmentId;
        if (user?.role === client_1.Role.HOD) {
            const staff = await this.prisma.staffProfile.findUnique({
                where: { userId: user.id },
            });
            departmentId = staff?.departmentId || undefined;
        }
        const where = {};
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
        if (!search)
            return parents;
        const q = search.toLowerCase();
        return parents.filter((p) => {
            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
            return (fullName.includes(q) ||
                (p.phone || '').includes(q) ||
                (p.email || '').toLowerCase().includes(q));
        });
    }
    async getStaffProfile(staffId, requester) {
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
        if (requester.role === client_1.Role.TEACHER) {
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
    async bulkImportStaff(staffList) {
        const results = { success: 0, failed: 0, errors: [] };
        for (const s of staffList) {
            try {
                let departmentId = s.departmentId;
                if (!departmentId && s.departmentName) {
                    const dept = await this.prisma.department.findFirst({
                        where: { name: { equals: s.departmentName, mode: 'insensitive' } },
                    });
                    if (dept)
                        departmentId = dept.id;
                }
                const dto = {
                    email: s.email,
                    password: s.password || exports.DEFAULT_STAFF_PASSWORD,
                    role: s.role || client_1.Role.TEACHER,
                    staffId: s.staffId || `STF-${Date.now()}-${results.success + results.failed}`,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    middleName: s.middleName,
                    gender: (s.gender || 'MALE').toUpperCase(),
                    phone: s.phone,
                    departmentId,
                };
                await this.createStaff(dto);
                results.success++;
            }
            catch (err) {
                results.failed++;
                results.errors.push({
                    staffId: s.staffId || s.email || 'unknown',
                    error: err.message || 'Unknown error',
                });
            }
        }
        return results;
    }
    async batchImportStudents(students) {
        const results = { success: 0, failed: 0, errors: [] };
        for (const s of students) {
            try {
                let currentClassId = s.currentClassId || s.currentclassid;
                let departmentId = s.departmentId || s.departmentid;
                if (!currentClassId && s.className) {
                    const cls = await this.prisma.classSection.findFirst({
                        where: { name: { equals: s.className, mode: 'insensitive' } },
                    });
                    if (cls)
                        currentClassId = cls.id;
                }
                if (!departmentId && s.departmentName) {
                    const dept = await this.prisma.department.findFirst({
                        where: { name: { equals: s.departmentName, mode: 'insensitive' } },
                    });
                    if (dept)
                        departmentId = dept.id;
                }
                const indexNumber = s.indexNumber || s.index_number;
                if (!indexNumber) {
                    throw new Error('Index number is required');
                }
                const existing = await this.prisma.studentProfile.findUnique({
                    where: { indexNumber },
                });
                if (existing) {
                    throw new Error(`Student with index number ${indexNumber} already exists`);
                }
                const dto = {
                    password: 'Student@123!',
                    indexNumber,
                    firstName: s.firstName || s.first_name,
                    lastName: s.lastName || s.last_name,
                    middleName: s.middleName || s.middle_name,
                    gender: (s.gender || 'MALE').toUpperCase(),
                    dateOfBirth: s.dateOfBirth || s.date_of_birth || s.dob,
                    currentClassId,
                    departmentId,
                    parentFirstName: s.parentFirstName || s.parent_first_name || s.parentFirstName,
                    parentLastName: s.parentLastName || s.parent_last_name || s.parentLastName,
                    parentPhone: s.parentPhone || s.parent_phone || s.parentPhone,
                    parentEmail: s.parentEmail || s.parent_email || s.parentEmail,
                    parentRelationship: s.parentRelationship || s.parent_relationship || s.parentRelationship || 'Guardian',
                    isBoarder: s.isBoarder != null ? s.isBoarder : (s.residential_status === 'BOARDING' ? true : (s.boarding === 'true' ? true : false)),
                };
                await this.createStudent(dto);
                results.success++;
            }
            catch (err) {
                results.failed++;
                results.errors.push({
                    indexNumber: s.indexNumber || s.index_number || 'unknown',
                    error: err.message || 'Unknown error',
                });
            }
        }
        return results;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map
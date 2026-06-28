"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const argon2 = require("argon2");
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
    async createStudent(dto) {
        const indexExists = await this.prisma.studentProfile.findUnique({
            where: { indexNumber: dto.indexNumber },
        });
        if (indexExists)
            throw new common_1.ConflictException(`Index number ${dto.indexNumber} already registered`);
        const passwordHash = await argon2.hash(dto.password);
        const email = dto.email ?? `${dto.indexNumber}@student.mandoshts.edu.gh`;
        const student = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                role: client_1.Role.STUDENT,
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
                        role: client_1.Role.PARENT,
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
                            studentId: student.studentProfile.id,
                            parentId: parentUser.parentProfile.id,
                        },
                    },
                    create: {
                        studentId: student.studentProfile.id,
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
    async createParent(dto) {
        const email = dto.email || `${dto.phone}@parent.com`;
        const exists = await this.prisma.user.findUnique({
            where: { email },
        });
        if (exists)
            throw new common_1.ConflictException('Parent email/phone already in use');
        const passwordHash = await argon2.hash(dto.password || 'Parent@123!');
        return this.prisma.user.create({
            data: {
                email,
                passwordHash,
                role: client_1.Role.PARENT,
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
    async getAllStudents(user) {
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
            return this.prisma.studentProfile.findMany({
                where: {
                    archivedAt: null,
                    currentClassId: { in: classSectionIds },
                },
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
        return this.prisma.studentProfile.findMany({
            where: {
                archivedAt: null,
            },
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
    async deactivateUser(userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { isActive: false },
        });
    }
    async updateStudentProfile(studentId, dto) {
        const profile = await this.prisma.studentProfile.findUniqueOrThrow({
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
    async batchImportStudents(students) {
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
            }
            catch (err) {
                results.failed++;
                results.errors.push({
                    indexNumber: s.indexNumber,
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
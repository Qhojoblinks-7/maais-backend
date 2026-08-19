"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = require("argon2");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding MAAIS database...\n');
    const adminPassword = await argon2.hash('Admin@2024!');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@mandoshts.edu.gh' },
        update: {},
        create: {
            email: 'admin@mandoshts.edu.gh',
            passwordHash: adminPassword,
            role: client_1.Role.SUPER_ADMIN,
            staffProfile: {
                create: {
                    staffId: 'STA-2024-001',
                    firstName: 'System',
                    lastName: 'Administrator',
                    gender: client_1.Gender.MALE,
                },
            },
        },
    });
    console.log('✅ Super Admin:', admin.email);
    const departments = await Promise.all([
        prisma.department.upsert({ where: { code: 'GEN' }, update: {}, create: { name: 'General Studies', code: 'GEN' } }),
        prisma.department.upsert({ where: { code: 'SCI' }, update: {}, create: { name: 'Science', code: 'SCI' } }),
        prisma.department.upsert({ where: { code: 'BUS' }, update: {}, create: { name: 'Business', code: 'BUS' } }),
        prisma.department.upsert({ where: { code: 'HEC' }, update: {}, create: { name: 'Home Economics', code: 'HEC' } }),
        prisma.department.upsert({ where: { code: 'ART' }, update: {}, create: { name: 'General Arts', code: 'ART' } }),
        prisma.department.upsert({ where: { code: 'TEC' }, update: {}, create: { name: 'Technical', code: 'TEC' } }),
        prisma.department.upsert({ where: { code: 'LAN' }, update: {}, create: { name: 'Languages', code: 'LAN' } }),
        prisma.department.upsert({ where: { code: 'STEM' }, update: {}, create: { name: 'STEM', code: 'STEM' } }),
        prisma.department.upsert({ where: { code: 'AT' }, update: {}, create: { name: 'Applied Technology', code: 'AT' } }),
        prisma.department.upsert({ where: { code: 'AGR' }, update: {}, create: { name: 'Agriculture', code: 'AGR' } }),
    ]);
    console.log('✅ Departments:', departments.map((d) => d.code).join(', '));
    const coreSubjects = [
        { name: 'English Language', code: '302', type: client_1.SubjectType.CORE, deptCode: 'GEN' },
        { name: 'Mathematics', code: '402', type: client_1.SubjectType.CORE, deptCode: 'GEN' },
        { name: 'General Science', code: '502', type: client_1.SubjectType.CORE, deptCode: 'SCI' },
        { name: 'Social Studies', code: '204', type: client_1.SubjectType.CORE, deptCode: 'GEN' },
        { name: 'Physical Education and Health', code: '511', type: client_1.SubjectType.CORE, deptCode: 'GEN' },
        { name: 'Art and Design Foundation', code: '705', type: client_1.SubjectType.CORE, deptCode: 'ART' },
        { name: 'Agricultural Science', code: '507', type: client_1.SubjectType.CORE, deptCode: 'AGR' },
    ];
    const electiveSubjects = [
        { name: 'Additional Mathematics', code: '401', type: client_1.SubjectType.ELECTIVE, deptCode: 'SCI' },
        { name: 'Physics', code: '512', type: client_1.SubjectType.ELECTIVE, deptCode: 'SCI' },
        { name: 'Chemistry', code: '505', type: client_1.SubjectType.ELECTIVE, deptCode: 'SCI' },
        { name: 'Biology', code: '504', type: client_1.SubjectType.ELECTIVE, deptCode: 'SCI' },
        { name: 'Geography', code: '216', type: client_1.SubjectType.ELECTIVE, deptCode: 'SCI' },
        { name: 'Robotics', code: '601', type: client_1.SubjectType.ELECTIVE, deptCode: 'STEM' },
        { name: 'Engineering', code: '602', type: client_1.SubjectType.ELECTIVE, deptCode: 'STEM' },
        { name: 'Aviation and Aerospace Engineering', code: '603', type: client_1.SubjectType.ELECTIVE, deptCode: 'STEM' },
        { name: 'Biomedical Science', code: '604', type: client_1.SubjectType.ELECTIVE, deptCode: 'STEM' },
        { name: 'Manufacturing Engineering', code: '605', type: client_1.SubjectType.ELECTIVE, deptCode: 'STEM' },
        { name: 'Design and Communication Technology', code: '608', type: client_1.SubjectType.ELECTIVE, deptCode: 'AT' },
        { name: 'Applied Technology (Automobile and Metal)', code: '609', type: client_1.SubjectType.ELECTIVE, deptCode: 'AT' },
        { name: 'Applied Technology (Building Construction and Wood)', code: '610', type: client_1.SubjectType.ELECTIVE, deptCode: 'AT' },
        { name: 'Applied Technology (Electrical and Electronic)', code: '611', type: client_1.SubjectType.ELECTIVE, deptCode: 'AT' },
        { name: 'ICT', code: '319', type: client_1.SubjectType.ELECTIVE, deptCode: 'TEC' },
        { name: 'Business Studies', code: '103', type: client_1.SubjectType.ELECTIVE, deptCode: 'BUS' },
        { name: 'Financial Accounting', code: '104', type: client_1.SubjectType.ELECTIVE, deptCode: 'BUS' },
        { name: 'Business Management', code: '113', type: client_1.SubjectType.ELECTIVE, deptCode: 'BUS' },
        { name: 'Economics', code: '203', type: client_1.SubjectType.ELECTIVE, deptCode: 'BUS' },
        { name: 'Office Practice', code: '114', type: client_1.SubjectType.ELECTIVE, deptCode: 'BUS' },
        { name: 'Marketing', code: '112', type: client_1.SubjectType.ELECTIVE, deptCode: 'BUS' },
        { name: 'Home Economics', code: '702', type: client_1.SubjectType.ELECTIVE, deptCode: 'HEC' },
        { name: 'Home Management', code: '703', type: client_1.SubjectType.ELECTIVE, deptCode: 'HEC' },
        { name: 'Art and Design Studio', code: '706', type: client_1.SubjectType.ELECTIVE, deptCode: 'ART' },
        { name: 'Performing Arts', code: '707', type: client_1.SubjectType.ELECTIVE, deptCode: 'ART' },
        { name: 'Literature in English', code: '210', type: client_1.SubjectType.ELECTIVE, deptCode: 'ART' },
        { name: 'Government', code: '205', type: client_1.SubjectType.ELECTIVE, deptCode: 'ART' },
        { name: 'History', code: '207', type: client_1.SubjectType.ELECTIVE, deptCode: 'ART' },
        { name: 'Christian Religious Studies', code: '202', type: client_1.SubjectType.ELECTIVE, deptCode: 'ART' },
        { name: 'Islamic Religious Studies', code: '208', type: client_1.SubjectType.ELECTIVE, deptCode: 'ART' },
        { name: 'Religious Studies', code: '209', type: client_1.SubjectType.ELECTIVE, deptCode: 'ART' },
        { name: 'French', code: '304', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Arabic', code: '301', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Spanish', code: '305', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Akan/Fante', code: '321', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Ewe', code: '322', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Ga', code: '323', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Nzema', code: '324', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Dagbani', code: '325', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Gonja', code: '326', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Dagaare', code: '330', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Hausa', code: '327', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Igbo', code: '328', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Yoruba', code: '329', type: client_1.SubjectType.ELECTIVE, deptCode: 'LAN' },
        { name: 'Agriculture', code: '506', type: client_1.SubjectType.ELECTIVE, deptCode: 'AGR' },
    ];
    const deptMap = Object.fromEntries(departments.map((d) => [d.code, d.id]));
    for (const s of [...coreSubjects, ...electiveSubjects]) {
        await prisma.subject.upsert({
            where: { code: s.code },
            update: {},
            create: { name: s.name, code: s.code, type: s.type },
        });
    }
    console.log('✅ Subjects:', coreSubjects.length + electiveSubjects.length, 'created');
    const classSections = [
        { name: '1A', level: client_1.ClassLevel.FORM_1, track: 'Gold' },
        { name: '1B', level: client_1.ClassLevel.FORM_1, track: 'Green' },
        { name: '2A', level: client_1.ClassLevel.FORM_2, track: 'Gold' },
        { name: '2B', level: client_1.ClassLevel.FORM_2, track: 'Green' },
        { name: '3A', level: client_1.ClassLevel.FORM_3, track: 'Gold' },
        { name: '3B', level: client_1.ClassLevel.FORM_3, track: 'Green' },
    ];
    for (const c of classSections) {
        await prisma.classSection.upsert({
            where: { name_level: { name: c.name, level: c.level } },
            update: {},
            create: c,
        });
    }
    console.log('✅ Class Sections:', classSections.map((c) => `${c.level} ${c.name}`).join(', '));
    const year = await prisma.academicYear.upsert({
        where: { label: '2024/2025' },
        update: {},
        create: {
            label: '2024/2025',
            startDate: new Date('2024-09-02'),
            endDate: new Date('2025-07-31'),
            isActive: true,
        },
    });
    const terms = [
        { termNumber: client_1.TermNumber.SEMESTER_1, startDate: new Date('2024-09-02'), endDate: new Date('2024-12-20') },
        { termNumber: client_1.TermNumber.SEMESTER_2, startDate: new Date('2025-01-13'), endDate: new Date('2025-04-11') },
    ];
    for (const t of terms) {
        await prisma.term.upsert({
            where: { academicYearId_termNumber: { academicYearId: year.id, termNumber: t.termNumber } },
            update: {},
            create: { academicYearId: year.id, ...t, isActive: t.termNumber === client_1.TermNumber.SEMESTER_1 },
        });
    }
    console.log('✅ Academic Year: 2024/2025 with 2 semesters');
    console.log('\n🎉 Seed complete!');
    console.log('   Admin login: admin@mandoshts.edu.gh / Admin@2024!');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map
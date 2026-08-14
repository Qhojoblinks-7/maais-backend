import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import "dotenv/config";
import * as seeds from './seeds';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({
  adapter
});

const YEARS = [
  { label: '2022/2023', startDate: new Date('2022-09-01'), endDate: new Date('2023-07-15') },
  { label: '2023/2024', startDate: new Date('2023-09-01'), endDate: new Date('2024-07-15') },
  { label: '2024/2025', startDate: new Date('2024-09-02'), endDate: new Date('2025-07-31') },
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, label: string): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isConnection = msg.includes('Connection terminated') || msg.includes('ECONNRESET') || msg.includes('timeout');
      if (!isConnection || attempt === retries) {
        console.error(`❌ ${label} failed after ${attempt} attempt(s):`, msg);
        throw err;
      }
      console.warn(`⚠️ ${label} attempt ${attempt} failed (${msg}). Retrying in 2s...`);
      await delay(2000);
    }
  }
  throw new Error('Unreachable');
}

async function main() {
  console.log('🌱 Starting full MAAIS database seed...\n');

  const admin = await withRetry(() => seeds.seedAdmin(prisma), 3, 'seedAdmin');
  const departments = await withRetry(() => seeds.seedDepartments(prisma), 3, 'seedDepartments');
  const deptMap = Object.fromEntries(departments.map((d) => [d.code, d.id]));
  const hods = await withRetry(() => seeds.seedHODs(prisma, departments), 3, 'seedHODs');
  const subjects = await withRetry(() => seeds.seedSubjects(prisma, deptMap), 3, 'seedSubjects');
  await withRetry(() => seeds.seedGrading(prisma), 3, 'seedGrading');
  const classes = await withRetry(() => seeds.seedClasses(prisma), 3, 'seedClasses');
  const teachers = await withRetry(() => seeds.seedStaff(prisma, departments, classes), 3, 'seedStaff');

  await withRetry(() => seeds.seedAdminSettings(prisma), 3, 'seedAdminSettings');
  await withRetry(() => seeds.seedDigitalSeals(prisma, teachers), 3, 'seedDigitalSeals');
  await withRetry(() => seeds.seedApprovals(prisma, teachers), 3, 'seedApprovals');

  for (const yearConfig of YEARS) {
    console.log(`\n📚 Seeding data for ${yearConfig.label}...`);

    const { year, terms } = await withRetry(
      () => seeds.seedAcademicYear(prisma, yearConfig.label, yearConfig.startDate, yearConfig.endDate),
      3,
      `seedAcademicYear(${yearConfig.label})`
    );

    const students = await withRetry(
      () => seeds.seedStudents(prisma, classes, departments, yearConfig.label),
      3,
      `seedStudents(${yearConfig.label})`
    );

    await withRetry(
      () => seeds.seedParents(prisma, students, yearConfig.label),
      3,
      `seedParents(${yearConfig.label})`
    );

    await withRetry(
      () => seeds.seedAssignments(prisma, teachers, subjects, classes, year.id),
      3,
      `seedAssignments(${yearConfig.label})`
    );

    const allGradeEntries = [];
    for (const term of terms) {
      const gradeEntries = await withRetry(
        () => seeds.seedGrades(prisma, students, subjects, term.id, teachers),
        3,
        `seedGrades(${yearConfig.label} term ${term.termNumber})`
      );
      allGradeEntries.push(...gradeEntries);
    }

    if (allGradeEntries.length > 0) {
      await withRetry(
        () => seeds.seedGradeCorrections(prisma, allGradeEntries.slice(0, 20), teachers),
        3,
        `seedGradeCorrections(${yearConfig.label})`
      );
    }

    if (allGradeEntries.length > 0) {
      await withRetry(
        () => seeds.seedGradeRevisions(prisma, allGradeEntries.slice(0, 15), teachers, subjects),
        3,
        `seedGradeRevisions(${yearConfig.label})`
      );
    }

    await withRetry(
      () => seeds.seedAttendance(prisma, students, terms),
      3,
      `seedAttendance(${yearConfig.label})`
    );

    for (const term of terms) {
      await withRetry(
        () => seeds.seedReports(prisma, students, term.id),
        3,
        `seedReports(${yearConfig.label} term ${term.termNumber})`
      );
    }

    for (const term of terms) {
      await withRetry(
        () => seeds.seedBehavior(prisma, students, term.id),
        3,
        `seedBehavior(${yearConfig.label} term ${term.termNumber})`
      );
    }

    await withRetry(
      () => seeds.seedInterventions(prisma, students),
      3,
      `seedInterventions(${yearConfig.label})`
    );

    await withRetry(
      () => seeds.seedPromotions(prisma, students, year, admin),
      3,
      `seedPromotions(${yearConfig.label})`
    );

    await withRetry(
      () => seeds.seedNotifications(prisma, students),
      3,
      `seedNotifications(${yearConfig.label})`
    );

    await withRetry(
      () => seeds.seedSupportTickets(prisma, students, teachers),
      3,
      `seedSupportTickets(${yearConfig.label})`
    );

    await withRetry(
      () => seeds.seedTranscripts(prisma, students),
      3,
      `seedTranscripts(${yearConfig.label})`
    );

    await withRetry(
      () => seeds.seedAudit(prisma, admin.id),
      3,
      `seedAudit(${yearConfig.label})`
    );

    console.log(`✅ ${yearConfig.label} complete`);
  }

  const activeYear = YEARS[YEARS.length - 1];
  const activeYearData = await withRetry(
    () => prisma.academicYear.findFirst({
      where: { label: activeYear.label },
      include: { terms: { where: { termNumber: 'SEMESTER_1' } } },
    }),
    3,
    'findActiveYear'
  );
  if (activeYearData && activeYearData.terms.length > 0) {
    await withRetry(
      () => seeds.seedTimetable(prisma, classes, subjects, teachers),
      3,
      'seedTimetable'
    );
  }

  console.log('\n🎉 Full seed complete!');
  console.log('   Admin login: admin@mandoshts.edu.gh / Admin@2024!');
  console.log('   HOD login: m.osei@mandoshts.edu.gh / HOD@2024!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

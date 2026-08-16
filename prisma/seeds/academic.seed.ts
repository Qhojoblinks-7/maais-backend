import "dotenv/config";
import { PrismaClient, ClassLevel, TermNumber } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({
  adapter,
});

const CLASS_SECTIONS = [
  { name: '1 Science 1', level: ClassLevel.FORM_1, program: 'Science' },
  { name: '1 General Arts 1', level: ClassLevel.FORM_1, program: 'General Arts' },
  { name: '1 Business 1', level: ClassLevel.FORM_1, program: 'Business' },
  { name: '1 Home Economics 1', level: ClassLevel.FORM_1, program: 'Home Economics' },
  { name: '1 Applied Technology 1', level: ClassLevel.FORM_1, program: 'Applied Technology' },
  { name: '1 STEM 1', level: ClassLevel.FORM_1, program: 'STEM' },
  { name: '1 Agriculture 1', level: ClassLevel.FORM_1, program: 'Agriculture' },
  { name: '1 Languages 1', level: ClassLevel.FORM_1, program: 'Languages' },
  { name: '2 Science 1', level: ClassLevel.FORM_2, program: 'Science' },
  { name: '2 General Arts 1', level: ClassLevel.FORM_2, program: 'General Arts' },
  { name: '2 Business 1', level: ClassLevel.FORM_2, program: 'Business' },
  { name: '2 Home Economics 1', level: ClassLevel.FORM_2, program: 'Home Economics' },
  { name: '2 Applied Technology 1', level: ClassLevel.FORM_2, program: 'Applied Technology' },
  { name: '2 STEM 1', level: ClassLevel.FORM_2, program: 'STEM' },
  { name: '2 Agriculture 1', level: ClassLevel.FORM_2, program: 'Agriculture' },
  { name: '2 Languages 1', level: ClassLevel.FORM_2, program: 'Languages' },
  { name: '3 Science 1', level: ClassLevel.FORM_3, program: 'Science' },
  { name: '3 General Arts 1', level: ClassLevel.FORM_3, program: 'General Arts' },
  { name: '3 Business 1', level: ClassLevel.FORM_3, program: 'Business' },
  { name: '3 Home Economics 1', level: ClassLevel.FORM_3, program: 'Home Economics' },
  { name: '3 Applied Technology 1', level: ClassLevel.FORM_3, program: 'Applied Technology' },
  { name: '3 STEM 1', level: ClassLevel.FORM_3, program: 'STEM' },
  { name: '3 Agriculture 1', level: ClassLevel.FORM_3, program: 'Agriculture' },
  { name: '3 Languages 1', level: ClassLevel.FORM_3, program: 'Languages' },
];

export async function seedClasses(prisma: PrismaClient) {
  const classes = [];
  for (const c of CLASS_SECTIONS) {
    const cls = await prisma.classSection.upsert({
      where: { name_level: { name: c.name, level: c.level } },
      update: {},
      create: c,
    });
    classes.push(cls);
  }
  console.log(`✅ ${classes.length} Class Sections seeded`);
  return classes;
}

export async function seedAcademicYear(prisma: PrismaClient, label: string, startDate: Date, endDate: Date) {
  const year = await prisma.academicYear.upsert({
    where: { label },
    update: { startDate, endDate },
    create: { label, startDate, endDate, isActive: label === '2024/2025' },
  });

  const termsData = [
    { termNumber: TermNumber.SEMESTER_1, startDate, endDate: new Date(startDate.getFullYear(), 10, 15) },
    { termNumber: TermNumber.SEMESTER_2, startDate: new Date(startDate.getFullYear() + 1, 1, 1), endDate },
  ];

  const terms = [];
  for (const t of termsData) {
    const term = await prisma.term.upsert({
      where: { academicYearId_termNumber: { academicYearId: year.id, termNumber: t.termNumber } },
      update: {},
      create: { academicYearId: year.id, ...t, isActive: t.termNumber === TermNumber.SEMESTER_1 && label === '2024/2025' },
    });
    terms.push(term);
  }

  console.log(`✅ Academic Year ${label} and Terms seeded`);
  return { year, terms };
}

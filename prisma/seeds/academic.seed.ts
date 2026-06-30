import "dotenv/config";
import { PrismaClient, ClassLevel, TermNumber } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({
  adapter,
});

export async function seedAcademic(prisma: PrismaClient) {
   // Academic Year
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

 // Terms
    const termsData = [
      { termNumber: TermNumber.TERM_1, startDate: new Date('2024-09-02'), endDate: new Date('2025-01-15') },
      { termNumber: TermNumber.TERM_2, startDate: new Date('2025-02-01'), endDate: new Date('2025-06-30') },
    ];

    const terms = [];
    for (const t of termsData) {
      const term = await prisma.term.upsert({
        where: { academicYearId_termNumber: { academicYearId: year.id, termNumber: t.termNumber } },
        update: {},
        create: { academicYearId: year.id, ...t, isActive: t.termNumber === TermNumber.TERM_1 },
      });
      terms.push(term);
    }

// Class Sections (split into Gold/Green tracks)
    const classSectionsData = [
      { name: '1 Science 1', level: ClassLevel.FORM_1, program: 'Science', track: 'Gold' },
      { name: '1 Science 2', level: ClassLevel.FORM_1, program: 'Science', track: 'Green' },
      { name: '1 General Arts 1', level: ClassLevel.FORM_1, program: 'General Arts', track: 'Gold' },
      { name: '1 Business 1', level: ClassLevel.FORM_1, program: 'Business', track: 'Green' },
      { name: '2 Science 1', level: ClassLevel.FORM_2, program: 'Science', track: 'Gold' },
      { name: '2 General Arts 1', level: ClassLevel.FORM_2, program: 'General Arts', track: 'Green' },
      { name: '2 Business 1', level: ClassLevel.FORM_2, program: 'Business', track: 'Gold' },
      { name: '3 Science 1', level: ClassLevel.FORM_3, program: 'Science', track: 'Green' },
      { name: '3 General Arts 1', level: ClassLevel.FORM_3, program: 'General Arts', track: 'Gold' },
    ];

   const classes = [];
   for (const c of classSectionsData) {
     const cls = await prisma.classSection.upsert({
       where: { name_level: { name: c.name, level: c.level } },
       update: {},
       create: c,
     });
     classes.push(cls);
   }

   console.log('✅ Academic Year, Terms, and Class Sections seeded');
   return { year, terms, classes }
}

async function main() {
  console.log('🌱 Seeding academic data...\n');
  await seedAcademic(prisma);
  await prisma.$disconnect();
  console.log('\n🎉 Academic seed complete!');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});

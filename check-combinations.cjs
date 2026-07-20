const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
require('dotenv').config();

async function main() {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({ adapter });

  const assignments = await prisma.teachingAssignment.findMany({
    include: {
      subject: { select: { id: true, name: true, code: true } },
      classSection: { select: { id: true, name: true, level: true } },
    },
  });

  const uniqueCombinations = new Map();
  for (const a of assignments) {
    const key = `${a.classSectionId}:${a.subjectId}`;
    if (!uniqueCombinations.has(key)) {
      uniqueCombinations.set(key, {
        className: a.classSection.name,
        subjectName: a.subject.name,
        subjectCode: a.subject.code,
      });
    }
  }

  console.log(`Total unique class-subject combinations: ${uniqueCombinations.size}`);
  const samples = Array.from(uniqueCombinations.values()).slice(0, 10);
  console.log('Samples:', JSON.stringify(samples, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);

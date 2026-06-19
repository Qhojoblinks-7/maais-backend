const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Updating term enum values...');
    const result1 = await prisma.$executeRawUnsafe(`UPDATE "terms" SET "termNumber" = 'SEMESTER_1' WHERE "termNumber" = 'TERM_1'`);
    console.log(`Updated TERM_1 -> SEMESTER_1: ${result1} rows`);
    
    const result2 = await prisma.$executeRawUnsafe(`UPDATE "terms" SET "termNumber" = 'SEMESTER_2' WHERE "termNumber" = 'TERM_2'`);
    console.log(`Updated TERM_2 -> SEMESTER_2: ${result2} rows`);

    console.log('Done!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Fixing TermNumber enum values...');
    
    await prisma.$executeRawUnsafe(`ALTER TYPE "TermNumber" RENAME VALUE 'TERM_1' TO 'SEMESTER_1'`);
    console.log('Renamed TERM_1 -> SEMESTER_1');
    
    await prisma.$executeRawUnsafe(`ALTER TYPE "TermNumber" RENAME VALUE 'TERM_2' TO 'SEMESTER_2'`);
    console.log('Renamed TERM_2 -> SEMESTER_2');
    
    const hasTerm3 = await prisma.$queryRawUnsafe(`SELECT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TERM_3')`);
    const term3Exists = hasTerm3[0]?.exists;
    if (term3Exists) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "TermNumber" DROP VALUE 'TERM_3'`);
      console.log('Dropped TERM_3');
    }
    
    console.log('Enum values fixed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient({});
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "TermNumber" RENAME VALUE 'TERM_1' TO 'SEMESTER_1'`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "TermNumber" RENAME VALUE 'TERM_2' TO 'SEMESTER_2'`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "TermNumber" DROP VALUE 'TERM_3'`);
    console.log('Enum values updated successfully');
  } catch (error) {
    console.error('Error updating enum values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
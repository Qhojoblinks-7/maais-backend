const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { config } = require('dotenv');
config({ path: require('path').join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    const entries = await prisma.gradeEntry.findMany({
      where: { submittedById: 'd05a5564-1278-4650-acfd-c545151f463f' },
      take: 5,
      select: { id: true, studentId: true, subjectId: true, classScore: true, examScore: true, termId: true, isLocked: true },
    });
    console.log(JSON.stringify(entries, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

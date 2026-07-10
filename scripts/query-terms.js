const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { config } = require('dotenv');
config({ path: require('path').join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    const year = await prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { terms: { orderBy: { termNumber: 'asc' } } },
    });
    if (!year) { console.log('No active year'); return; }
    console.log(`Active year: ${year.label} (${year.id})`);
    for (const t of year.terms) {
      console.log(`  Term: ${t.name} | id: ${t.id} | isActive: ${t.isActive} | isLocked: ${t.isLocked}`);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

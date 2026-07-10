const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { config } = require('dotenv');
config({ path: require('path').join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    const hod = await prisma.staffProfile.findFirst({
      where: { user: { email: 's.mensah@mandoshts.edu.gh' } },
      select: { id: true, firstName: true, lastName: true },
    });
    console.log('HOD SCI staff profile:', hod);

    if (hod) {
      const notifications = await prisma.notification.findMany({
        where: { staffId: hod.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, body: true, isRead: true, createdAt: true, channel: true },
      });
      console.log(`\nAll notifications for HOD staffId=${hod.id} (${notifications.length}):`);
      notifications.forEach((n, i) => {
        console.log(`  ${i+1}. title="${n.title}" | isRead=${n.isRead} | channel=${n.channel} | ${n.createdAt}`);
      });

      const unread = await prisma.notification.count({
        where: { staffId: hod.id, isRead: false },
      });
      console.log(`\nUnread count (isRead=false): ${unread}`);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

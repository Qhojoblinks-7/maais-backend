import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import "dotenv/config";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n=== ALL USERS ===');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, isActive: true },
    orderBy: { role: 'asc' },
  });
  users.forEach(u => console.log(`  ${u.role}: ${u.email} (${u.id})`));

  console.log('\n=== TEACHER STAFF PROFILES ===');
  const staff = await prisma.staffProfile.findMany({
    include: { user: { select: { email: true, role: true } } },
    orderBy: { firstName: 'asc' },
  });
  staff.forEach(s => {
    console.log(`  ${s.firstName} ${s.lastName} | ${s.user?.email} | staffId: ${s.staffId}`);
  });

  console.log('\n=== TEACHING ASSIGNMENTS COUNT ===');
  const assignmentCount = await prisma.teachingAssignment.count();
  console.log(`Total teaching assignments: ${assignmentCount}`);

  const teacherAssignments = await prisma.teachingAssignment.groupBy({
    by: ['teacherId'],
    _count: { teacherId: true },
  });
  console.log('Assignments per teacher:');
  teacherAssignments.forEach(t => {
    console.log(`  Teacher ${t.teacherId}: ${t._count.teacherId} assignments`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);

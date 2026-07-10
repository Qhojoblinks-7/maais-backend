const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['a.konadu@mandoshts.edu.gh', 's.mensah@mandoshts.edu.gh'] } },
    include: { staffProfile: { include: { department: true } } }
  });
  console.log(JSON.stringify(users, null, 2));

  const teacher = users.find(u => u.email === 'a.konadu@mandoshts.edu.gh');
  const hod = users.find(u => u.email === 's.mensah@mandoshts.edu.gh');

  if (teacher?.staffProfile?.departmentId && hod?.staffProfile?.departmentId) {
    const sameDept = teacher.staffProfile.departmentId === hod.staffProfile.departmentId;
    console.log('SAME_DEPARTMENT=' + sameDept);
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });

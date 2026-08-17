import { PrismaClient, Role, Gender } from '@prisma/client';
import * as argon2 from 'argon2';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@school.edu.gh';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@2024!';
  const firstName = process.argv[4] || process.env.ADMIN_FIRST_NAME || 'System';
  const lastName = process.argv[5] || process.env.ADMIN_LAST_NAME || 'Administrator';

  const hash = await argon2.hash(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      isActive: true,
      mustChangePassword: true,
    },
    create: {
      email,
      passwordHash: hash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      mustChangePassword: true,
      staffProfile: {
        create: {
          staffId: 'STA-2024-001',
          firstName,
          lastName,
          gender: Gender.MALE,
        },
      },
    },
  });

  console.log(`✅ Admin reset: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   User ID: ${user.id}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});

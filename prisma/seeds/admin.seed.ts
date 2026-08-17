import { PrismaClient, Role, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

export async function seedAdmin(prisma: PrismaClient) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.edu.gh';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2024!';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'System';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'Administrator';
  const passwordHash = await argon2.hash(adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      role: Role.SUPER_ADMIN,
      staffProfile: {
        create: {
          staffId: 'STA-2024-001',
          firstName: adminFirstName,
          lastName: adminLastName,
          gender: Gender.MALE,
        },
      },
    },
  });
  console.log(`✅ Super Admin seeded (${adminEmail})`);
  return admin;
}

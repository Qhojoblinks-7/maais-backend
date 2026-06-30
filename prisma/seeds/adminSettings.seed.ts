import { PrismaClient } from '@prisma/client';

export async function seedAdminSettings(prisma: PrismaClient) {
  const existing = await prisma.adminSettings.findFirst();
  if (existing) {
    console.log(`✅ Admin Settings already exists`);
    return existing;
  }

  const settings = await prisma.adminSettings.create({
    data: {
      maintenanceMode: false,
      mfaEnabled: true,
      systemFrozen: false,
    },
  });

  console.log(`✅ Admin Settings seeded`);
  return settings;
}
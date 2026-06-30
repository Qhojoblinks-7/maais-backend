import { PrismaClient } from '@prisma/client';

export async function seedDigitalSeals(prisma: PrismaClient, teachers: any[]) {
  const seals = [];

  for (let i = 0; i < 3; i++) {
    const seal = await prisma.digitalSeal.create({
      data: {
        schoolStampUrl: `https://assets.mandoshts.edu.gh/stamp_${i + 1}.png`,
        signatureUrl: `https://assets.mandoshts.edu.gh/signature_${i + 1}.png`,
        assignedToStaff: teachers[i % teachers.length]?.id,
        isActive: i < 2,
        createdAt: new Date(Date.now() - i * 86400000),
      },
    });
    seals.push(seal);
  }

  console.log(`✅ ${seals.length} Digital Seals seeded`);
  return seals;
}
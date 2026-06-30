import { PrismaClient, PromotionStatus, ClassLevel } from '@prisma/client';

export async function seedPromotions(prisma: PrismaClient, students: any[], year: any, admin: any) {
  const promotions = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const fromClass = [ClassLevel.FORM_1, ClassLevel.FORM_2, ClassLevel.FORM_3][i % 3];
    const toClass = fromClass === ClassLevel.FORM_3 ? undefined : ({
      [ClassLevel.FORM_1]: ClassLevel.FORM_2,
      [ClassLevel.FORM_2]: ClassLevel.FORM_3,
    }[fromClass]);

    const promotion = await prisma.promotionRecord.create({
      data: {
        studentId: student.id,
        academicYearId: year.id,
        fromClass,
        toClass,
        status: toClass ? PromotionStatus.PROMOTED : PromotionStatus.GRADUATED,
        notes: 'Academic progression record',
        performedById: admin.id,
        performedAt: new Date(Date.now() - i * 86400000),
      },
    });
    promotions.push(promotion);
  }

  console.log(`✅ ${promotions.length} Promotion Records seeded`);
  return promotions;
}
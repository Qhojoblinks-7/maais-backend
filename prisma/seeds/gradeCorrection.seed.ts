import { PrismaClient } from '@prisma/client';

export async function seedGradeCorrections(prisma: PrismaClient, gradeEntries: any[], teachers: any[]) {
  const corrections = [];

  const fieldsChanged = ['classScore', 'examScore', 'remark'];
  const reasons = [
    'Data entry error correction',
    'Score recalculation after review',
    'Administrative adjustment',
    'Appeals committee decision',
  ];

  for (let i = 0; i < Math.min(20, gradeEntries.length); i++) {
    const gradeEntry = gradeEntries[i];
    const teacher = teachers[i % teachers.length];
    const oldScore = Math.floor(Math.random() * 30) + 50;
    const newScore = Math.floor(Math.random() * 20) + 60;

    const correction = await prisma.gradeCorrection.create({
      data: {
        gradeEntryId: gradeEntry.id,
        changedById: teacher.userId,
        fieldChanged: fieldsChanged[i % fieldsChanged.length],
        oldValue: oldScore.toString(),
        newValue: newScore.toString(),
        reason: reasons[i % reasons.length],
      },
    });
    corrections.push(correction);
  }

  console.log(`✅ ${corrections.length} Grade Corrections seeded`);
  return corrections;
}
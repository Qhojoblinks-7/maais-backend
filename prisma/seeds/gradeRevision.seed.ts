import { PrismaClient } from '@prisma/client';

export async function seedGradeRevisions(prisma: PrismaClient, gradeEntries: any[], teachers: any[], subjects: any[] = []) {
  const revisions = [];

  const issues = [
    'Grade discrepancy identified',
    'Score normalization needed',
    'Missing exam score entry',
    'Incorrect class score calculation',
    'Double entry detected',
  ];
  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['open', 'in_review', 'resolved', 'dismissed'];

  for (let i = 0; i < Math.min(15, gradeEntries.length); i++) {
    const gradeEntry = gradeEntries[i];
    const teacher = teachers[i % teachers.length];
    const subject = subjects[i % subjects.length];

    const revision = await prisma.gradeRevision.create({
      data: {
        teacherId: teacher.id,
        studentId: gradeEntry.studentId,
        subjectId: gradeEntry.subjectId,
        gradeEntryId: gradeEntry.id,
        issue: issues[i % issues.length],
        severity: severities[i % severities.length],
        status: statuses[i % statuses.length],
        history: {
          changes: [
            { field: 'totalScore', oldValue: '65', newValue: '70', changedAt: new Date(Date.now() - 86400000).toISOString() },
          ],
        },
      },
    });
    revisions.push(revision);
  }

  console.log(`✅ ${revisions.length} Grade Revisions seeded`);
  return revisions;
}
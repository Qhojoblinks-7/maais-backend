import { PrismaClient } from '@prisma/client';

export async function seedGrades(prisma: PrismaClient, students: any[], subjects: any[], termId: string, teachers: any[]) {
  const grades = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    for (let j = 0; j < subjects.length; j++) {
      const subject = subjects[j];
      const classScore = Math.floor(Math.random() * 20) + 10; // 10-30
      const examScore = Math.floor(Math.random() * 40) + 30; // 30-70
      const totalScore = classScore + examScore;

      // Determine grade based on totalScore
      let grade = 'F9';
      if (totalScore >= 80) grade = 'A1';
      else if (totalScore >= 70) grade = 'B2';
      else if (totalScore >= 65) grade = 'B3';
      else if (totalScore >= 60) grade = 'C4';
      else if (totalScore >= 55) grade = 'C5';
      else if (totalScore >= 50) grade = 'C6';
      else if (totalScore >= 45) grade = 'D7';
      else if (totalScore >= 40) grade = 'E8';

      // Assign a teacher by index cycling through
      const teacher = teachers[j % teachers.length];

      const entry = await prisma.gradeEntry.upsert({
        where: {
          studentId_subjectId_termId: {
            studentId: student.id,
            subjectId: subject.id,
            termId,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          subjectId: subject.id,
          termId,
          classScore,
          examScore,
          totalScore,
          grade,
          hasObservation: j % 3 === 0, // Every 3rd entry has observation (simulate mixed state)
          submittedById: teacher?.userId,
          submittedAt: new Date(),
          isApproved: true,
          isLocked: true,
        },
      });
      grades.push(entry);
    }
  }

  console.log(`✅ ${grades.length} Grade Entries seeded`);
  return grades;
}

import { PrismaClient } from '@prisma/client';

const CORE_CODES = ['302', '402', '502', '204'];

const programElectives: Record<string, string[]> = {
  'Science': ['401', '512', '505', '504'],
  'General Arts': ['210', '205', '207', '202'],
  'Business': ['103', '104', '113', '203'],
  'Home Economics': ['702', '703', '504', '216'],
  'Technical': ['319', '608', '512', '505'],
};

export async function seedGrades(prisma: PrismaClient, students: any[], subjects: any[], termId: string, teachers: any[]) {
  const grades = [];
  const subjectMap = new Map(subjects.map(s => [s.code, s]));

  console.log(`[DEBUG] seedGrades: students=${students.length}, subjects=${subjects.length}, termId=${termId}`);
  if (students.length > 0) {
    console.log(`[DEBUG] first student currentClass=${students[0].currentClass?.name}, currentClassId=${students[0].currentClassId}`);
  }

  let withClass = 0;
  let withoutClass = 0;

  for (const student of students) {
    let cls = student.currentClass;
    if (!cls && student.currentClassId) {
      cls = await prisma.classSection.findUnique({ where: { id: student.currentClassId } });
    }
    if (!cls) {
      withoutClass++;
      continue;
    }
    withClass++;

    const program = cls.program || 'General Arts';
    const electives = programElectives[program] || programElectives['General Arts'];
    const classSubjectCodes = [...CORE_CODES, ...electives];

    for (let j = 0; j < classSubjectCodes.length; j++) {
      const code = classSubjectCodes[j];
      const subject = subjectMap.get(code);
      if (!subject) continue;

      const classScore = Math.floor(Math.random() * 20) + 10;
      const examScore = Math.floor(Math.random() * 40) + 30;
      const totalScore = classScore + examScore;

      let grade = 'F9';
      if (totalScore >= 80) grade = 'A1';
      else if (totalScore >= 70) grade = 'B2';
      else if (totalScore >= 65) grade = 'B3';
      else if (totalScore >= 60) grade = 'C4';
      else if (totalScore >= 55) grade = 'C5';
      else if (totalScore >= 50) grade = 'C6';
      else if (totalScore >= 45) grade = 'D7';
      else if (totalScore >= 40) grade = 'E8';

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
          hasObservation: j % 3 === 0,
          submittedById: teacher?.userId,
          submittedAt: new Date(),
          isApproved: true,
          isLocked: true,
        },
      });
      grades.push(entry);
    }
  }

  console.log(`✅ ${grades.length} Grade Entries seeded (students with class: ${withClass}, without class: ${withoutClass})`);
  return grades;
}

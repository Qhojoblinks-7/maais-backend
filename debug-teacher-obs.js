const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const TEACHER_USER_ID = 'fa3f1188-ebbd-454d-9b47-05e09ecb041a';

  console.log('\n=== TEACHER PROFILE ===');
  const staff = await prisma.staffProfile.findFirst({
    where: { userId: TEACHER_USER_ID },
    select: { id: true, firstName: true, lastName: true, departmentId: true },
  });
  console.log('StaffProfile:', JSON.stringify(staff, null, 2));

  if (!staff) {
    console.log('NO STAFF PROFILE FOUND');
    await prisma.$disconnect();
    return;
  }

  console.log('\n=== TEACHING ASSIGNMENTS ===');
  const assignments = await prisma.teachingAssignment.findMany({
    where: { teacherId: staff.id },
    select: { id: true, subjectId: true, classSectionId: true, academicYearId: true },
  });
  console.log('Assignments count:', assignments.length);
  console.log('Assignments:', JSON.stringify(assignments, null, 2));

  const subjectIds = [...new Set(assignments.map(a => a.subjectId))];
  const classSectionIds = [...new Set(assignments.map(a => a.classSectionId))];

  console.log('\n=== SUBJECTS ===');
  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true, code: true, departmentId: true },
  });
  console.log('Subjects:', JSON.stringify(subjects, null, 2));

  console.log('\n=== CLASSES ===');
  const classes = await prisma.classSection.findMany({
    where: { id: { in: classSectionIds } },
    select: { id: true, name: true, level: true, program: true },
  });
  console.log('Classes:', JSON.stringify(classes, null, 2));

  console.log('\n=== STUDENTS IN THESE CLASSES ===');
  const students = await prisma.studentProfile.findMany({
    where: { currentClassId: { in: classSectionIds }, archivedAt: null },
    select: { id: true, firstName: true, lastName: true, indexNumber: true, currentClassId: true },
  });
  console.log('Students count:', students.length);
  console.log('Students:', JSON.stringify(students.slice(0, 5), null, 2));

  const studentIds = students.map(s => s.id);

  console.log('\n=== MISSING OBSERVATIONS (current query: studentId IN + subjectId IN) ===');
  const activeTerm = await prisma.term.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const missingWithBothFilters = await prisma.gradeEntry.findMany({
    where: {
      termId: activeTerm?.id,
      hasObservation: false,
      OR: [{ classScore: { not: null } }, { examScore: { not: null } }],
      studentId: { in: studentIds },
      subjectId: { in: subjectIds },
    },
    include: {
      student: { select: { firstName: true, lastName: true, indexNumber: true, currentClass: { select: { name: true } } } },
      subject: { select: { name: true, code: true } },
    },
    orderBy: { student: { lastName: 'asc' } },
  });
  console.log('Missing with both filters:', missingWithBothFilters.length);
  missingWithBothFilters.forEach(e => {
    console.log(`  - ${e.student?.firstName} ${e.student?.lastName} | ${e.student?.currentClass?.name} | ${e.subject?.name}`);
  });

  console.log('\n=== MISSING OBSERVATIONS (WRONG: only studentId filter, no subject filter) ===');
  const missingWithStudentOnly = await prisma.gradeEntry.findMany({
    where: {
      termId: activeTerm?.id,
      hasObservation: false,
      OR: [{ classScore: { not: null } }, { examScore: { not: null } }],
      studentId: { in: studentIds },
    },
    include: {
      student: { select: { firstName: true, lastName: true, indexNumber: true, currentClass: { select: { name: true } } } },
      subject: { select: { name: true, code: true } },
    },
    orderBy: { student: { lastName: 'asc' } },
  });
  console.log('Missing with student-only filter:', missingWithStudentOnly.length);
  missingWithStudentOnly.forEach(e => {
    console.log(`  - ${e.student?.firstName} ${e.student?.lastName} | ${e.student?.currentClass?.name} | ${e.subject?.name}`);
  });

  console.log('\n=== LEAKAGE CHECK ===');
  const wrongSubjects = missingWithStudentOnly.filter(
    e => !subjectIds.includes(e.subjectId)
  );
  console.log('Entries that leak through when subject filter is missing:', wrongSubjects.length);
  wrongSubjects.forEach(e => {
    console.log(`  LEAK: ${e.student?.firstName} ${e.student?.lastName} | ${e.student?.currentClass?.name} | ${e.subject?.name} (subjectId: ${e.subjectId})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import "dotenv/config";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const TEACHER_USER_ID = '319c006a-b5e5-473d-a51c-3188fec5df71';

  console.log('\n========================================');
  console.log('  TEACHER DATA DIAGNOSTIC');
  console.log('========================================\n');

  // 1. TEACHER PROFILE
  console.log('=== 1. TEACHER PROFILE ===');
  const staff = await prisma.staffProfile.findFirst({
    where: { userId: TEACHER_USER_ID },
    select: { id: true, firstName: true, lastName: true, departmentId: true, staffId: true },
  });
  console.log('StaffProfile:', JSON.stringify(staff, null, 2));
  if (!staff) { await prisma.$disconnect(); return; }

  // 2. TEACHING ASSIGNMENTS
  console.log('\n=== 2. TEACHING ASSIGNMENTS ===');
  const assignments = await prisma.teachingAssignment.findMany({
    where: { teacherId: staff.id },
    include: {
      subject: { select: { id: true, name: true, code: true, departmentId: true } },
      classSection: { select: { id: true, name: true, level: true, program: true } },
    },
    orderBy: [
      { classSection: { level: 'asc' } },
      { classSection: { name: 'asc' } },
      { subject: { name: 'asc' } },
    ],
  });
  console.log(`Total assignments: ${assignments.length}`);
  assignments.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.subject.name} (${a.subject.code}) → ${a.classSection.name} (${a.classSection.level})`);
  });

  const subjectIds = [...new Set(assignments.map(a => a.subjectId))];
  const classSectionIds = [...new Set(assignments.map(a => a.classSectionId))];

  // 3. STUDENTS IN CLASSES
  console.log('\n=== 3. STUDENTS IN TEACHER CLASSES ===');
  const students = await prisma.studentProfile.findMany({
    where: { currentClassId: { in: classSectionIds }, archivedAt: null },
    select: { id: true, firstName: true, lastName: true, indexNumber: true, currentClassId: true },
  });
  console.log(`Total students: ${students.length}`);
  const studentIds = students.map(s => s.id);

  // 4. ACTIVE TERM
  const activeTerm = await prisma.term.findFirst({
    where: { isActive: true },
    select: { id: true, termNumber: true, startDate: true, endDate: true, isLocked: true },
  });
  console.log(`\n=== 4. ACTIVE TERM ===`);
  console.log('Active term:', JSON.stringify(activeTerm, null, 2));

  if (!activeTerm) { await prisma.$disconnect(); return; }

  // 5. GRADE ENTRIES FOR TEACHER
  console.log('\n=== 5. GRADE ENTRIES FOR TEACHER ===');
  const allGrades = await prisma.gradeEntry.findMany({
    where: {
      studentId: { in: studentIds },
      subjectId: { in: subjectIds },
      termId: activeTerm.id,
    },
    include: {
      student: { select: { firstName: true, lastName: true, indexNumber: true, currentClass: { select: { name: true } } } },
      subject: { select: { name: true, code: true } },
    },
  });
  console.log(`Total grade entries: ${allGrades.length}`);
  
  const withScores = allGrades.filter(g => typeof g.totalScore === 'number');
  const withObservation = allGrades.filter(g => g.hasObservation === true);
  const missingObs = allGrades.filter(g => g.hasObservation === false && (g.classScore !== null || g.examScore !== null));
  
  console.log(`  - With scores: ${withScores.length}`);
  console.log(`  - With observations: ${withObservation.length}`);
  console.log(`  - Missing observations (has scores but no obs): ${missingObs.length}`);

  // 6. CLASS PROGRESS (what dashboard shows)
  console.log('\n=== 6. CLASS PROGRESS (Dashboard) ===');
  for (const assignment of assignments) {
    const classStudents = students.filter(s => s.currentClassId === assignment.classSectionId);
    const classGrades = allGrades.filter(g => g.studentId && classStudents.some(s => s.id === g.studentId) && g.subjectId === assignment.subjectId);
    const completed = classGrades.filter(g => typeof g.totalScore === 'number' && g.hasObservation === true).length;
    const progress = classStudents.length > 0 ? Math.round((completed / classStudents.length) * 100) : 0;
    
    console.log(`  ${assignment.subject.name} - ${assignment.classSection.name}: ${completed}/${classStudents.length} = ${progress}%`);
  }

  // 7. MISSING OBSERVATIONS BREAKDOWN
  console.log('\n=== 7. MISSING OBSERVATIONS BREAKDOWN ===');
  console.log(`Total missing: ${missingObs.length}`);
  
  const bySubject: Record<string, number> = {};
  const byClass: Record<string, number> = {};
  
  missingObs.forEach(entry => {
    const subj = entry.subject?.name || 'Unknown';
    const cls = entry.student?.currentClass?.name || 'Unknown';
    bySubject[subj] = (bySubject[subj] || 0) + 1;
    byClass[cls] = (byClass[cls] || 0) + 1;
  });

  console.log('\nBy Subject:');
  Object.entries(bySubject).sort((a, b) => b[1] - a[1]).forEach(([subj, count]) => {
    console.log(`  ${subj}: ${count}`);
  });

  console.log('\nBy Class:');
  Object.entries(byClass).sort((a, b) => b[1] - a[1]).forEach(([cls, count]) => {
    console.log(`  ${cls}: ${count}`);
  });

  // 8. OBSERVATIONS LOGGED
  console.log('\n=== 8. OBSERVATIONS LOGGED ===');
  console.log(`Total logged observations: ${withObservation.length}`);
  
  const loggedBySubject: Record<string, number> = {};
  const loggedByClass: Record<string, number> = {};
  
  withObservation.forEach(entry => {
    const subj = entry.subject?.name || 'Unknown';
    const cls = entry.student?.currentClass?.name || 'Unknown';
    loggedBySubject[subj] = (loggedBySubject[subj] || 0) + 1;
    loggedByClass[cls] = (loggedByClass[cls] || 0) + 1;
  });

  console.log('\nLogged by Subject:');
  Object.entries(loggedBySubject).sort((a, b) => b[1] - a[1]).forEach(([subj, count]) => {
    console.log(`  ${subj}: ${count}`);
  });

  console.log('\nLogged by Class:');
  Object.entries(loggedByClass).sort((a, b) => b[1] - a[1]).forEach(([cls, count]) => {
    console.log(`  ${cls}: ${count}`);
  });

  // 9. SUMMARY
  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(`Total assignments: ${assignments.length}`);
  console.log(`Total students: ${students.length}`);
  console.log(`Total grade entries: ${allGrades.length}`);
  console.log(`Total with scores: ${withScores.length}`);
  console.log(`Total with observations: ${withObservation.length}`);
  console.log(`Total missing observations: ${missingObs.length}`);
  console.log(`\nDashboard should show:`);
  assignments.forEach(a => {
    const classStudents = students.filter(s => s.currentClassId === a.classSectionId);
    const classGrades = allGrades.filter(g => g.studentId && classStudents.some(s => s.id === g.studentId) && g.subjectId === a.subjectId);
    const completed = classGrades.filter(g => typeof g.totalScore === 'number' && g.hasObservation === true).length;
    const progress = classStudents.length > 0 ? Math.round((completed / classStudents.length) * 100) : 0;
    console.log(`  ${a.subject.name} - ${a.classSection.name}: ${progress}% (${completed}/${classStudents.length})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);

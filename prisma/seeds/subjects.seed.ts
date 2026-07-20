import { PrismaClient, SubjectType } from '@prisma/client';

export async function seedSubjects(prisma: PrismaClient, deptMap: Record<string, string>) {
  const coreSubjects = [
    { name: 'English Language', code: '302', type: SubjectType.CORE, deptCode: 'GEN' },
    { name: 'Mathematics', code: '402', type: SubjectType.CORE, deptCode: 'GEN' },
    { name: 'Integrated Science', code: '502', type: SubjectType.CORE, deptCode: 'SCI' },
    { name: 'Social Studies', code: '204', type: SubjectType.CORE, deptCode: 'GEN' },
  ];

  const electiveSubjects = [
    { name: 'Elective Mathematics', code: '401', type: SubjectType.ELECTIVE, deptCode: 'SCI' },
    { name: 'Physics', code: '512', type: SubjectType.ELECTIVE, deptCode: 'SCI' },
    { name: 'Chemistry', code: '505', type: SubjectType.ELECTIVE, deptCode: 'SCI' },
    { name: 'Biology', code: '504', type: SubjectType.ELECTIVE, deptCode: 'SCI' },
    { name: 'Agricultural Science', code: '507', type: SubjectType.ELECTIVE, deptCode: 'SCI' },
    { name: 'Geography', code: '216', type: SubjectType.ELECTIVE, deptCode: 'SCI' },
    { name: 'Health Education', code: '508', type: SubjectType.ELECTIVE, deptCode: 'SCI' },
    { name: 'ICT', code: '319', type: SubjectType.ELECTIVE, deptCode: 'TEC' },
    { name: 'Technical Drawing', code: '608', type: SubjectType.ELECTIVE, deptCode: 'TEC' },
    { name: 'Commerce', code: '103', type: SubjectType.ELECTIVE, deptCode: 'BUS' },
    { name: 'Financial Accounting', code: '104', type: SubjectType.ELECTIVE, deptCode: 'BUS' },
    { name: 'Business Management', code: '113', type: SubjectType.ELECTIVE, deptCode: 'BUS' },
    { name: 'Economics', code: '203', type: SubjectType.ELECTIVE, deptCode: 'BUS' },
    { name: 'Office Practice', code: '114', type: SubjectType.ELECTIVE, deptCode: 'BUS' },
    { name: 'Marketing', code: '112', type: SubjectType.ELECTIVE, deptCode: 'BUS' },
    { name: 'Literature in English', code: '210', type: SubjectType.ELECTIVE, deptCode: 'ART' },
    { name: 'Government', code: '205', type: SubjectType.ELECTIVE, deptCode: 'ART' },
    { name: 'History', code: '207', type: SubjectType.ELECTIVE, deptCode: 'ART' },
    { name: 'Christian Religious Studies', code: '202', type: SubjectType.ELECTIVE, deptCode: 'ART' },
    { name: 'Islamic Religious Studies', code: '208', type: SubjectType.ELECTIVE, deptCode: 'ART' },
    { name: 'Music', code: '705', type: SubjectType.ELECTIVE, deptCode: 'ART' },
    { name: 'Visual Art', code: '706', type: SubjectType.ELECTIVE, deptCode: 'ART' },
    { name: 'French', code: '304', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Arabic', code: '301', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Akan/Fante', code: '321', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Ewe', code: '322', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Ga', code: '323', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Nzema', code: '324', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Dagbani', code: '325', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Gonja', code: '326', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Dagaare', code: '330', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Hausa', code: '327', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Igbo', code: '328', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Yoruba', code: '329', type: SubjectType.ELECTIVE, deptCode: 'LAN' },
    { name: 'Physical Education', code: '511', type: SubjectType.ELECTIVE, deptCode: 'GEN' },
    { name: 'Food and Nutrition', code: '702', type: SubjectType.ELECTIVE, deptCode: 'HEC' },
    { name: 'Home Management', code: '703', type: SubjectType.ELECTIVE, deptCode: 'HEC' },
  ];

  const results = [];
  for (const s of [...coreSubjects, ...electiveSubjects]) {
    const sub = await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: {
        name: s.name,
        code: s.code,
        type: s.type,
        departmentId: deptMap[s.deptCode],
      },
    });
    results.push(sub);
  }
  console.log(`✅ ${results.length} Subjects seeded`);
  return results;
}

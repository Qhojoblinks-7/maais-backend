import { PrismaClient } from '@prisma/client';

export async function seedAssignments(prisma: PrismaClient, teachers: any[], subjects: any[], classes: any[], yearId: string) {
  const assignments = [];

  const subjectMap = new Map(subjects.map(s => [s.code, s]));

  const CORE_CODES = ['302', '402', '502', '204'];

  const programElectives: Record<string, string[]> = {
    'Science': ['401', '512', '505', '504'],
    'General Arts': ['210', '205', '207', '202'],
    'Business': ['103', '104', '113', '203'],
    'Home Economics': ['702', '703', '504', '216'],
    'Technical': ['319', '608', '512', '505'],
  };

  const subjectDept: Record<string, string> = {
    '302': 'GEN', '402': 'GEN', '502': 'SCI', '204': 'GEN',
    '401': 'SCI', '512': 'SCI', '505': 'SCI', '504': 'SCI', '507': 'SCI', '508': 'SCI',
    '216': 'ART', '210': 'ART', '205': 'ART', '207': 'ART', '202': 'ART', '208': 'ART', '705': 'ART', '706': 'ART',
    '103': 'BUS', '104': 'BUS', '113': 'BUS', '203': 'BUS', '114': 'BUS', '112': 'BUS', '105': 'BUS',
    '319': 'TEC', '608': 'TEC', '607': 'TEC', '609': 'TEC', '604': 'TEC', '605': 'TEC', '606': 'TEC',
    '702': 'HEC', '703': 'HEC', '704': 'HEC',
    '301': 'LAN', '304': 'LAN', '321': 'LAN', '322': 'LAN', '323': 'LAN', '324': 'LAN',
    '325': 'LAN', '326': 'LAN', '330': 'LAN', '327': 'LAN', '328': 'LAN', '329': 'LAN',
    '511': 'GEN',
  };

  const deptMap = new Map();
  for (const t of teachers) {
    if (t.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: t.departmentId } });
      if (dept) {
        deptMap.set(t.id, dept.code);
      }
    }
  }

  const teacherSubjectSet = new Map<string, Set<string>>();

  function getTeacherForSubject(subjectCode: string): any {
    const deptCode = subjectDept[subjectCode] || 'GEN';
    const candidates = teachers.filter(t => {
      const teacherDeptCode = deptMap.get(t.id);
      const isDeptMatch = teacherDeptCode === deptCode;
      if (!isDeptMatch) return false;
      const subjectSet = teacherSubjectSet.get(t.id) || new Set();
      if (subjectSet.size >= 7) return false;
      return true;
    });

    if (candidates.length === 0) {
      const anyCandidates = teachers.filter(t => {
        const subjectSet = teacherSubjectSet.get(t.id) || new Set();
        return subjectSet.size < 7;
      });
      return anyCandidates[0] || null;
    }

    candidates.sort((a, b) => {
      const aCount = (teacherSubjectSet.get(a.id) || new Set()).size;
      const bCount = (teacherSubjectSet.get(b.id) || new Set()).size;
      return aCount - bCount;
    });
    return candidates[0];
  }

  for (const cls of classes) {
    const program = cls.program || 'General Arts';
    const electives = programElectives[program] || programElectives['General Arts'];
    const classSubjectCodes = [...CORE_CODES, ...electives];

    for (const code of classSubjectCodes) {
      const sub = subjectMap.get(code);
      if (!sub) continue;

      const teacher = getTeacherForSubject(code);
      if (!teacher) continue;

      const subjectSet = teacherSubjectSet.get(teacher.id) || new Set();
      subjectSet.add(code);
      teacherSubjectSet.set(teacher.id, subjectSet);

      const assignment = await prisma.teachingAssignment.upsert({
        where: {
          teacherId_subjectId_classSectionId_academicYearId: {
            teacherId: teacher.id,
            subjectId: sub.id,
            classSectionId: cls.id,
            academicYearId: yearId,
          },
        },
        update: {},
        create: {
          teacherId: teacher.id,
          subjectId: sub.id,
          classSectionId: cls.id,
          academicYearId: yearId,
        },
      });
      assignments.push(assignment);
    }
  }

  console.log(`✅ ${assignments.length} Teaching Assignments seeded`);
  return assignments;
}

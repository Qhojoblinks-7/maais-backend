import { PrismaClient, DayOfWeek } from '@prisma/client';

const CORE_CODES = ['302', '402', '502', '204'];

const programElectives: Record<string, string[]> = {
  'Science': ['401', '512', '505', '504'],
  'General Arts': ['210', '205', '207', '202'],
  'Business': ['103', '104', '113', '203'],
  'Home Economics': ['702', '703', '504', '216'],
  'Technical': ['319', '608', '512', '505'],
};

export async function seedTimetable(prisma: PrismaClient, classes: any[], subjects: any[], teachers: any[]) {
  const entries = [];
  const days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY];
  const subjectMap = new Map(subjects.map(s => [s.code, s]));

  for (const cls of classes) {
    const program = cls.program || 'General Arts';
    const electives = programElectives[program] || programElectives['General Arts'];
    const classSubjectCodes = [...CORE_CODES, ...electives];

    let slotIndex = 0;
    for (const code of classSubjectCodes) {
      const sub = subjectMap.get(code);
      if (!sub) continue;

      const teacher = teachers[slotIndex % teachers.length];
      const day = days[slotIndex % days.length];

      const entry = await prisma.timetableEntry.create({
        data: {
          classId: cls.id,
          subjectId: sub.id,
          teacherId: teacher.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '09:30',
          room: `Room ${Math.floor(Math.random() * 10) + 1}`,
          track: cls.track,
        },
      });
      entries.push(entry);
      slotIndex++;
    }
  }

  console.log(`✅ ${entries.length} Timetable Entries seeded`);
  return entries;
}

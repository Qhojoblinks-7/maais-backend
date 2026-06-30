import { PrismaClient, InterventionStatus } from '@prisma/client';

export async function seedInterventions(prisma: PrismaClient, students: any[]) {
  const alerts = [];
  const statuses = [InterventionStatus.ACTIVE, InterventionStatus.IN_PROGRESS, InterventionStatus.RESOLVED];

  const subjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science'];
  const interventionTypes = ['Academic Performance', 'Attendance', 'Behavioral', 'Financial', 'Health'];
  const notesTemplates = [
    'Significant drop in {} and {} scores requiring attention.',
    '{} average has declined steadily over the term.',
    'Student showing signs of academic struggle in core subjects.',
    'Performance gap identified between classwork and exam scores.',
    'Attendance issues affecting academic progress.',
  ];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const status = statuses[i % statuses.length];
    const subject1 = subjects[i % subjects.length];
    const subject2 = subjects[(i + 1) % subjects.length];
    const interventionType = interventionTypes[i % interventionTypes.length];

    const previousAvg = 70 + Math.floor(Math.random() * 20);
    const currentAvg = 50 + Math.floor(Math.random() * 25);
    const dropPercentage = ((previousAvg - currentAvg) / previousAvg * 100).toFixed(1);

    const alert = await prisma.interventionAlert.create({
      data: {
        studentId: student.id,
        previousAverage: previousAvg,
        currentAverage: currentAvg,
        dropPercentage: parseFloat(dropPercentage as unknown as string),
        status,
        notes: notesTemplates[i % notesTemplates.length].replace('{}', subject1).replace('{}', subject2),
        ...(status === InterventionStatus.RESOLVED ? { resolvedAt: new Date(Date.now() - Math.random() * 86400000 * 7) } : {}),
      },
    });
    alerts.push(alert);
  }

  const statusCounts = alerts.reduce((acc: Record<string, number>, _, idx: number) => {
    acc[statuses[idx % statuses.length]] = (acc[statuses[idx % statuses.length]] || 0) + 1;
    return acc;
  }, {});

  console.log(`✅ ${alerts.length} Intervention Alerts seeded (ACTIVE: ${statusCounts[InterventionStatus.ACTIVE]}, IN_PROGRESS: ${statusCounts[InterventionStatus.IN_PROGRESS]}, RESOLVED: ${statusCounts[InterventionStatus.RESOLVED]})`);
  return alerts;
}

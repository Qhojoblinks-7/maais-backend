import { PrismaClient } from '@prisma/client';

export async function seedSupportTickets(prisma: PrismaClient, students: any[], teachers: any[] = []) {
  const tickets = [];

  const categories = ['Academic', 'Technical', 'Finance', 'General'];
  const priorities = ['HIGH', 'MEDIUM', 'LOW'];
  const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
  const titles = [
    'Need help with grade submission',
    'Unable to access report card',
    'Payment receipt not received',
    'Question about subject selection',
    'System error during login',
    'Request for transcript verification',
    'Need assistance with elective choices',
    'Missing marks for assessment',
  ];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const status = statuses[i % statuses.length];
    const creatorUserId = teachers[i % teachers.length]?.userId || student.userId;
    const ticket = await prisma.supportTicket.create({
      data: {
        studentId: student.id,
        title: titles[i % titles.length],
        description: `This is a detailed description for ticket ${i + 1}. The student needs assistance with ${categories[i % categories.length].toLowerCase()} related issue.`,
        category: categories[i % categories.length],
        priority: priorities[i % priorities.length],
        status,
        createdById: creatorUserId,
        assignedTo: status !== 'OPEN' ? teachers[(i + 1) % teachers.length]?.userId : undefined,
        createdAt: new Date(Date.now() - i * 86400000),
        resolvedAt: status === 'RESOLVED' ? new Date(Date.now() - i * 43200000) : undefined,
      },
      include: {
        createdBy: { select: { id: true, email: true, role: true } },
      },
    });
    tickets.push(ticket);
  }

  console.log(`✅ ${tickets.length} Support Tickets seeded`);
  return tickets;
}
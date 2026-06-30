import { PrismaClient } from '@prisma/client';

export async function seedApprovals(prisma: PrismaClient, teachers: any[]) {
  const approvals = [];

  const priorities = ['low', 'normal', 'high'];
  const categories = ['grade_submission', 'report_generation', 'data_access', 'other'];
  const statuses = ['pending', 'approved', 'rejected'];
  const details = [
    'Request to approve grades for Mathematics',
    'Request to generate report card for Term 1',
    'Request for access to archived records',
    'Request to update student information',
    'Request to approve exam schedule changes',
    'Request to unlock grade entry for corrections',
  ];

  for (let i = 0; i < 10; i++) {
    const teacher = teachers[i % teachers.length];
    const approval = await prisma.approvalRequest.create({
      data: {
        teacherId: teacher.id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        detail: details[i % details.length],
        priority: priorities[i % priorities.length],
        category: categories[i % categories.length],
        status: statuses[i % statuses.length],
        resolutionNotes: statuses[i % statuses.length] !== 'pending' ? `Action taken for request ${i + 1}` : undefined,
        documentUrl: statuses[i % statuses.length] !== 'pending' ? `https://docs.mandoshts.edu.gh/approval_${i + 1}.pdf` : undefined,
        requestedAt: new Date(Date.now() - i * 86400000),
        resolvedAt: statuses[i % statuses.length] !== 'pending' ? new Date(Date.now() - i * 43200000) : undefined,
        resolvedById: statuses[i % statuses.length] !== 'pending' ? teacher.userId : undefined,
      },
    });
    approvals.push(approval);
  }

  console.log(`✅ ${approvals.length} Approval Requests seeded`);
  return approvals;
}
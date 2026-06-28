import { PrismaClient, AuditAction } from '@prisma/client';

export async function seedAudit(prisma: PrismaClient, userId: string) {
  const logs = [];

  const gradeCorrectionPayloads = [
    { indexNumber: '001', oldGrade: 'C6', newGrade: 'B3' },
    { indexNumber: '045', oldGrade: 'D7', newGrade: 'C5' },
    { indexNumber: '102', oldGrade: 'B3', newGrade: 'A2' },
    { studentIndex: '023', oldGrade: 'C5', newGrade: 'B2' },
  ];

  const promotePayloads = [
    { fromClass: 'SHS 1 Agric A', toClass: 'SHS 2 Agric B', studentName: 'Angela Owusu' },
    { fromClass: 'SHS 2 Agric B', toClass: 'SHS 3 Agric A', studentName: 'Kwame Mensah' },
    { fromClass: 'SHS 1 Science A', toClass: 'SHS 2 Science B', studentName: 'Akosua Boateng' },
    { fromClass: 'SHS 1 Business A', toClass: 'SHS 2 Business B', studentName: 'Yaw Asante' },
  ];

  const studentNames = ['Angela Owusu', 'Kwame Mensah', 'Akosua Boateng', 'Yaw Asante', 'Efia Badu', 'Kofi Ansah'];
  const departments = ['Science', 'Mathematics', 'Business', 'Agriculture', 'Home Economics'];

  for (let i = 0; i < 40; i++) {
    let payload: any;
    let action: AuditAction;
    let entity: string;
    let entityId: string;

    if (i % 5 === 0) {
      const gcPayload = gradeCorrectionPayloads[i % gradeCorrectionPayloads.length];
      payload = { indexNumber: gcPayload.indexNumber || gcPayload.studentIndex, oldGrade: gcPayload.oldGrade, newGrade: gcPayload.newGrade, studentName: studentNames[i % studentNames.length] };
      action = AuditAction.GRADE_CORRECTION;
      entity = 'GradeEntry';
      entityId = studentNames[i % studentNames.length];
    } else if (i % 5 === 1) {
      const prPayload = promotePayloads[i % promotePayloads.length];
      payload = { fromClass: prPayload.fromClass, toClass: prPayload.toClass, studentName: prPayload.studentName };
      action = AuditAction.PROMOTE;
      entity = 'StudentProfile';
      entityId = prPayload.studentName;
    } else if (i % 5 === 2) {
      payload = { action: 'FREEZE', departmentName: departments[i % departments.length], reason: 'Administrative action' };
      action = AuditAction.UPDATE;
      entity = 'Department';
      entityId = departments[i % departments.length];
    } else if (i % 5 === 3) {
      payload = { action: 'TRANSFER', teacherName: studentNames[i % studentNames.length], fromDepartmentName: departments[i % departments.length], toDepartmentName: departments[(i + 1) % departments.length] };
      action = AuditAction.UPDATE;
      entity = 'StaffProfile';
      entityId = studentNames[i % studentNames.length];
    } else {
      payload = { action: 'STRATEGY_PULSE_UPLOAD', departmentName: departments[i % departments.length] };
      action = AuditAction.CREATE;
      entity = 'Department';
      entityId = departments[i % departments.length];
    }
    
    const log = await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        payload,
        ipAddress: ['192.168.1.45', '192.168.1.12', '10.0.0.1', '127.0.0.1'][i % 4],
        userAgent: i % 2 === 0 ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' : 'Chrome 120.0.0.0',
      },
    });
    logs.push(log);
  }

  console.log(`✅ ${logs.length} Audit Logs seeded`);
  return logs;
}
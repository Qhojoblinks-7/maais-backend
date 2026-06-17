import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  async getPortalData(studentId: string, requesterId?: string, requesterRole?: Role) {
    let targetStudentId = studentId;

    if (requesterRole === Role.STUDENT && requesterId) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: requesterId },
        select: { id: true },
      });

      if (!student) {
        throw new ForbiddenException('Student profile not found');
      }

      targetStudentId = student.id;
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: targetStudentId },
      include: { currentClass: true },
    });

    const latestReport = await this.prisma.reportCard.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    const attendance = await this.prisma.attendanceRecord.findMany({
      where: { studentId },
    });

    const notifications = await this.prisma.notification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const grades = await this.prisma.gradeEntry.findMany({
      where: { studentId },
      include: { subject: true },
    });

    const interventions = await this.prisma.interventionAlert.findMany({
      where: {
        studentId,
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
      },
    });

    const attendancePercentage = this.calculateAttendance(attendance);

    return {
      student: {
        id: student?.id,
        firstName: student?.firstName,
        lastName: student?.lastName,
        indexNumber: student?.indexNumber,
        currentClassId: student?.currentClassId,
        currentClass: student?.currentClass,
      },
      cgpa: latestReport?.averageScore ?? 0,
      classRank: latestReport?.classPosition,
      approvalStatus: latestReport?.releasedAt ? 'APPROVED' : 'PENDING',
      attendancePercentage,
      recentResults: grades,
      notifications,
      activeInterventions: interventions,
    };
  }

  private calculateAttendance(records: any[]) {
    const present = records.reduce((sum, r) => sum + r.daysPresent, 0);
    const total = records.reduce((sum, r) => sum + r.totalDays, 0);

    if (!total) return 0;

    return Number(((present / total) * 100).toFixed(2));
  }
}

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class MedicalService {
  constructor(private prisma: PrismaService) {}

  async getMedicalRecords(
    studentId: string,
    requesterId?: string,
    requesterRole?: Role,
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        userId: true,
        currentClassId: true,
        departmentId: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (requesterRole && requesterRole !== Role.STUDENT && requesterId) {
      if (requesterRole === Role.TEACHER) {
        const staff = await this.prisma.staffProfile.findUnique({
          where: { userId: requesterId },
          select: { id: true },
        });
        if (!staff) {
          throw new ForbiddenException('Teacher profile not found');
        }
        const assignment = await this.prisma.teachingAssignment.findFirst({
          where: {
            teacherId: staff.id,
            classSectionId: student.currentClassId,
          },
        });
        if (!assignment) {
          throw new ForbiddenException(
            'You do not have access to this student medical records',
          );
        }
      } else if (requesterRole === Role.HOD) {
        const staff = await this.prisma.staffProfile.findUnique({
          where: { userId: requesterId },
          select: { departmentId: true },
        });
        if (!staff?.departmentId) {
          throw new ForbiddenException('HOD department not assigned');
        }
        const studentWithDept = await this.prisma.studentProfile.findUnique({
          where: { id: studentId },
          select: { departmentId: true },
        });
        if (studentWithDept?.departmentId !== staff.departmentId) {
          throw new ForbiddenException(
            'You do not have access to students outside your department',
          );
        }
      }
    }

    return this.prisma.medicalRecord.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMedicalRecord(
    studentId: string,
    data: {
      condition: string;
      onsetDate?: string;
      resolvedAt?: string;
      treatment?: string;
      medication?: string;
      dosage?: string;
      notes?: string;
      status?: string;
    },
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.medicalRecord.create({
      data: {
        studentId,
        condition: data.condition,
        onsetDate: data.onsetDate ? new Date(data.onsetDate) : null,
        resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : null,
        treatment: data.treatment,
        medication: data.medication,
        dosage: data.dosage,
        notes: data.notes,
        status: data.status || 'ACTIVE',
      },
    });
  }

  async updateMedicalRecord(
    recordId: string,
    studentId: string,
    data: {
      condition?: string;
      onsetDate?: string;
      resolvedAt?: string;
      treatment?: string;
      medication?: string;
      dosage?: string;
      notes?: string;
      status?: string;
    },
  ) {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: recordId, studentId },
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    const updateData: any = {};
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.onsetDate !== undefined)
      updateData.onsetDate = data.onsetDate ? new Date(data.onsetDate) : null;
    if (data.resolvedAt !== undefined)
      updateData.resolvedAt = data.resolvedAt
        ? new Date(data.resolvedAt)
        : null;
    if (data.treatment !== undefined) updateData.treatment = data.treatment;
    if (data.medication !== undefined) updateData.medication = data.medication;
    if (data.dosage !== undefined) updateData.dosage = data.dosage;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.medicalRecord.update({
      where: { id: recordId },
      data: updateData,
    });
  }

  async deleteMedicalRecord(recordId: string, studentId: string) {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: recordId, studentId },
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    await this.prisma.medicalRecord.delete({
      where: { id: recordId },
    });

    return { success: true };
  }
}

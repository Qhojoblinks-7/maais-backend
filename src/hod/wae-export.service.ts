import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HODExportService } from './hod-export.service';
import { WAECValidationService } from './waec-validation.service';
import { Role } from '@prisma/client';

export interface WAEExportResult {
  success: boolean;
  message: string;
  referenceId?: string;
  exportedCount?: number;
  validationErrors?: { row: number; issues: string[] }[];
}

@Injectable()
export class WAEExportService {
  private readonly logger = new Logger(WAEExportService.name);

  constructor(
    private config: ConfigService,
    private hodExportService: HODExportService,
    private waecValidation: WAECValidationService,
  ) {}

  async previewCSV(
    termId: string,
    userId: string,
    userRole: Role,
    className?: string,
  ): Promise<{
    data: any[];
    validationResult: {
      valid: boolean;
      errors: { row: number; issues: string[] }[];
    };
  }> {
    if (
      userRole !== Role.HOD &&
      userRole !== Role.HEADMASTER &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new InternalServerErrorException('Access denied');
    }

    const classSections = await this.hodExportService[
      'prisma'
    ].classSection.findMany({
      select: { id: true, name: true },
    });

    const targetClass = className
      ? classSections.find((c) => c.name === className)
      : classSections[0];

    if (!targetClass) {
      throw new InternalServerErrorException('Class not found');
    }

    const students = await this.hodExportService[
      'prisma'
    ].studentProfile.findMany({
      where: { currentClassId: targetClass.id, archivedAt: null },
      include: {
        grades: {
          where: { termId },
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        },
      },
      orderBy: { indexNumber: 'asc' },
    });

    const previewData: any[] = [];

    for (const student of students) {
      for (const g of student.grades) {
        const row = {
          CandidateNumber: student.indexNumber || '',
          Surname: student.lastName || '',
          OtherNames: student.firstName || '',
          DateOfBirth: student.dateOfBirth
            ? new Date(student.dateOfBirth).toISOString().split('T')[0]
            : '',
          Gender: student.gender === 'FEMALE' ? 'F' : 'M',
          SubjectCode: g.subject?.code || '',
          ContinuousAssessment: g.classScore ?? 0,
          ExamScore: g.examScore ?? 0,
        };
        previewData.push(row);
      }
    }

    const validationResult = this.waecValidation.validateCSVRows(previewData);

    return {
      data: previewData,
      validationResult,
    };
  }

  async prepareForWAEP(
    termId: string,
    userId: string,
    userRole: Role,
  ): Promise<WAEExportResult> {
    if (
      userRole !== Role.HOD &&
      userRole !== Role.HEADMASTER &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new InternalServerErrorException(
        'Only HOD can prepare WAEC STP data',
      );
    }

    try {
      const activeTerm = await this.hodExportService['prisma'].term.findUnique({
        where: { id: termId },
        include: { academicYear: true },
      });

      if (!activeTerm) {
        throw new InternalServerErrorException('Term not found');
      }

      const classSections = await this.hodExportService[
        'prisma'
      ].classSection.findMany({
        select: { id: true, name: true },
      });

      let totalExported = 0;
      const preparedFiles: string[] = [];
      const allValidationErrors: { row: number; issues: string[] }[] = [];

      for (const classSection of classSections) {
        const preview = await this.previewCSV(
          termId,
          userId,
          userRole,
          classSection.name,
        );
        if (!preview.validationResult.valid) {
          allValidationErrors.push(...preview.validationResult.errors);
        }

        const csvContent = await this.hodExportService.exportWAECCSV(
          termId,
          classSection.name,
          userId,
          userRole,
        );

        const filename = `WAEC_${classSection.name}_${activeTerm.academicYear?.label || 'term'}.csv`;
        preparedFiles.push(filename);
        totalExported += (csvContent.match(/\n/g) || []).length - 1;
      }

      this.logger.log(
        `WAEC STP preparation completed: ${preparedFiles.length} class files, ${totalExported} records`,
      );

      return {
        success: true,
        message: `Prepared ${preparedFiles.length} CSV files for WAEC STP manual upload`,
        exportedCount: totalExported,
        validationErrors:
          allValidationErrors.length > 0 ? allValidationErrors : undefined,
      };
    } catch (err) {
      this.logger.error(`WAEC STP preparation failed: ${err.message}`);
      throw new InternalServerErrorException(err.message);
    }
  }
}

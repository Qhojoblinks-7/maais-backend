import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, AuditAction } from '@prisma/client';
import { GradingService } from './grading.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { UpsertGradeDto, CorrectGradeDto } from './dto/grading.dto';

@ApiTags('Grading')
@ApiBearerAuth()
@Controller('grading')
export class GradingController {
  constructor(
    private gradingService: GradingService,
    private prisma: PrismaService,
  ) {}

  @Post('entries')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Submit or update a grade entry' })
  upsertGrade(@Body() dto: UpsertGradeDto, @CurrentUser('id') userId: string) {
    return this.gradingService.upsertGrade(dto, userId);
  }

  @Post('entries/bulk')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Bulk grade entry for a class/subject' })
  bulkUpsert(@Body() body: any, @CurrentUser('id') userId: string) {
    const entries = body?.entries || body;
    console.log(
      '[GradingController] bulkUpsert received entries count:',
      Array.isArray(entries) ? entries.length : 'not an array',
    );
    console.log(
      '[GradingController] bulkUpsert first entry:',
      entries?.[0] ? JSON.stringify(entries[0], null, 2) : 'none',
    );
    return this.gradingService.bulkUpsertGrades(entries, userId);
  }

  @Patch('entries/:id/lock')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Lock a grade entry' })
  lockGrade(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.lockGrade(id, userId, role);
  }

  @Patch('entries/:id/approve')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Approve a grade entry' })
  approveGrade(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.approveGrade(id, userId, role);
  }

  @Post('entries/bulk-approve')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Bulk approve grade entries' })
  bulkApprove(
    @Body('ids') ids: string[],
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.bulkApproveGrades(ids, userId, role);
  }

  @Post('corrections')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Submit a grade correction with audit trail' })
  correctGrade(
    @Body() dto: CorrectGradeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.gradingService.correctGrade(dto, userId);
  }

  @Get('audit-tray')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get missing observations tray' })
  getMissingObservations(
    @Query('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getMissingObservationsTray(termId, userId, role);
  }

  @Get('missing-observations')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get missing observations (flat list)' })
  getMissingObservationsFlat(
    @Query('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getMissingObservationsTray(termId, userId, role);
  }

  @Get('entries/:id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get a single grade entry' })
  getGradeEntry(@Param('id') id: string) {
    return this.prisma.gradeEntry.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            indexNumber: true,
            currentClass: { select: { name: true } },
          },
        },
        subject: { select: { id: true, name: true } },
        term: { select: { id: true, termNumber: true } },
      },
    });
  }

  @Patch('entries/:id/unlock')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Unlock a grade entry' })
  async unlockGrade(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const updated = await this.prisma.gradeEntry.update({
      where: { id },
      data: { isLocked: false, lockedById: null, lockedAt: null },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UNLOCK,
        entity: 'GradeEntry',
        entityId: id,
        payload: { gradeEntryId: id, unlockedById: userId },
      },
    });

    return updated;
  }

  @Get('classes/:classId/terms/:termId/performance')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get class performance summary' })
  getClassPerformance(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getClassPerformanceSummary(
      classId,
      termId,
      userId,
      role,
    );
  }

  @Get('class-summary/:classId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get class performance summary' })
  getClassSummary(
    @Param('classId') classId: string,
    @Query('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getClassPerformanceSummary(
      classId,
      termId,
      userId,
      role,
    );
  }

  @Get('students/:studentId/terms/:termId')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get all grades for a student in a term' })
  getStudentTermGrades(
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getStudentTermGrades(studentId, termId, role);
  }

  @Get('students/for-grading')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Get students eligible for grading by subject and class',
  })
  async getStudentsForGrading(
    @Query('subjectId') subjectId: string,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getStudentsForGrading(
      subjectId,
      classId,
      termId,
      userId,
      role,
    );
  }

  @Get('compliance/warnings')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get system compliance warnings for active term' })
  getComplianceWarnings(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getComplianceWarnings(userId, role);
  }

  @Get('term-summary/:termId')
  @Roles(Role.HOD)
  @ApiOperation({
    summary: 'Get summary stats for a term (student count, grade entry count)',
  })
  getTermSummary(
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getTermSummary(termId, userId, role);
  }

  @Get('smart-remarks/:grade')
  @ApiOperation({ summary: 'Get smart remark suggestions for a grade' })
  getSmartRemarks(@Param('grade') grade: string) {
    return { grade, remarks: this.gradingService.getSmartRemarks(grade) };
  }

  @Get('rules')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get current grading rules configuration' })
  async getGradingRules(@Query('termId') termId: string) {
    if (termId) {
      const rules = await this.prisma.assessmentRules.findUnique({
        where: { termId },
        include: { term: true },
      });
      if (rules) return rules;
    }
    const existing = await this.prisma.assessmentRules.findFirst();
    if (!existing) {
      return this.prisma.assessmentRules.create({
        data: {
          termId: 'default',
          caWeight: 30,
          examWeight: 70,
          normalizationEnabled: true,
        },
      });
    }
    return existing;
  }

  @Get('last-saved')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Get the last time a grade entry was saved for the current user',
  })
  async getLastSaved(@CurrentUser('id') userId: string) {
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staffProfile) {
      return { lastSaved: null };
    }

    const lastEntry = await this.prisma.gradeEntry.findFirst({
      where: { submittedById: userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return {
      lastSaved: lastEntry?.updatedAt || null,
    };
  }

  @Put('rules')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Update grading rules configuration' })
  async updateGradingRules(
    @Body()
    body: {
      termId?: string;
      caWeight?: number;
      examWeight?: number;
      normalizationEnabled?: boolean;
      submissionDeadline?: string;
    },
  ) {
    if (!body.termId) {
      const existing = await this.prisma.assessmentRules.findFirst();
      if (!existing) {
        return this.prisma.assessmentRules.create({
          data: {
            termId: 'default',
            caWeight: body.caWeight ?? 30,
            examWeight: body.examWeight ?? 70,
            normalizationEnabled: body.normalizationEnabled ?? true,
            submissionDeadline: body.submissionDeadline
              ? new Date(body.submissionDeadline)
              : undefined,
          },
        });
      }
      return this.prisma.assessmentRules.update({
        where: { id: existing.id },
        data: {
          caWeight: body.caWeight ?? existing.caWeight,
          examWeight: body.examWeight ?? existing.examWeight,
          normalizationEnabled:
            body.normalizationEnabled ?? existing.normalizationEnabled,
          submissionDeadline: body.submissionDeadline
            ? new Date(body.submissionDeadline)
            : existing.submissionDeadline,
        },
      });
    }
    return this.prisma.assessmentRules.upsert({
      where: { termId: body.termId },
      create: {
        termId: body.termId,
        caWeight: body.caWeight ?? 30,
        examWeight: body.examWeight ?? 70,
        normalizationEnabled: body.normalizationEnabled ?? true,
        submissionDeadline: body.submissionDeadline
          ? new Date(body.submissionDeadline)
          : undefined,
      },
      update: {
        caWeight: body.caWeight ?? 30,
        examWeight: body.examWeight ?? 70,
        normalizationEnabled: body.normalizationEnabled ?? true,
        submissionDeadline: body.submissionDeadline
          ? new Date(body.submissionDeadline)
          : undefined,
      },
    });
  }
}

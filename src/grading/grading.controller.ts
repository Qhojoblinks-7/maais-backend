import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GradingService } from './grading.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import {
  UpsertGradeDto,
  BulkUpsertGradeDto,
  CorrectGradeDto,
} from './dto/grading.dto';

@ApiTags('Grading')
@ApiBearerAuth()
@Controller('grading')
export class GradingController {
  constructor(private gradingService: GradingService, private prisma: PrismaService) {}

  @Post('entries')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Submit or update a grade entry' })
  upsertGrade(@Body() dto: UpsertGradeDto, @CurrentUser('id') userId: string) {
    return this.gradingService.upsertGrade(dto, userId);
  }

  @Post('entries/bulk')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk grade entry for a class/subject' })
  bulkUpsert(
    @Body() dto: BulkUpsertGradeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.gradingService.bulkUpsertGrades(dto.entries, userId);
  }

  @Patch('entries/:id/lock')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lock a grade entry' })
  lockGrade(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.lockGrade(id, userId, role);
  }

  @Patch('entries/:id/approve')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve a grade entry' })
  approveGrade(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.approveGrade(id, userId, role);
  }

  @Post('entries/bulk-approve')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk approve grade entries' })
  bulkApprove(
    @Body('ids') ids: string[],
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.bulkApproveGrades(ids, userId, role);
  }

  @Post('corrections')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Submit a grade correction with audit trail' })
  correctGrade(
    @Body() dto: CorrectGradeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.gradingService.correctGrade(dto, userId);
  }

  @Get('audit-tray')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get missing observations tray' })
  getMissingObservations(
    @Query('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getMissingObservationsTray(termId, userId, role);
  }

  @Get('missing-observations')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get missing observations (flat list)' })
  getMissingObservationsFlat(
    @Query('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getMissingObservationsTray(termId, userId, role);
  }

  @Get('entries/:id')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single grade entry' })
  getGradeEntry(@Param('id') id: string) {
    return this.prisma.gradeEntry.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, indexNumber: true, currentClass: { select: { name: true } } } },
        subject: { select: { id: true, name: true } },
        term: { select: { id: true, termNumber: true } },
      },
    });
  }

  @Patch('entries/:id/unlock')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Unlock a grade entry' })
  unlockGrade(@Param('id') id: string) {
    return this.prisma.gradeEntry.update({
      where: { id },
      data: { isLocked: false, lockedById: null, lockedAt: null },
    });
  }

  @Get('classes/:classId/terms/:termId/performance')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get class performance summary' })
  getClassPerformance(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getClassPerformanceSummary(classId, termId, userId, role);
  }

  @Get('class-summary/:classId')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN, Role.TEACHER)
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
  @Roles(
    Role.TEACHER,
    Role.HOD,
    Role.HEADMASTER,
    Role.SUPER_ADMIN,
    Role.STUDENT,
  )
  @ApiOperation({ summary: 'Get all grades for a student in a term' })
  getStudentTermGrades(
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getStudentTermGrades(studentId, termId, role);
  }

  @Get('students/for-grading')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get students eligible for grading by subject and class' })
  async getStudentsForGrading(
    @Query('subjectId') subjectId: string,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.gradingService.getStudentsForGrading(subjectId, classId, termId, userId, role);
  }

  @Get('smart-remarks/:grade')
  @ApiOperation({ summary: 'Get smart remark suggestions for a grade' })
  getSmartRemarks(@Param('grade') grade: string) {
    return { grade, remarks: this.gradingService.getSmartRemarks(grade) };
  }
}

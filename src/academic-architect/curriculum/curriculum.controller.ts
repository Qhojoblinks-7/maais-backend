import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurriculumService } from './curriculum.service';
import { Roles, CurrentUser } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Curriculum')
@ApiBearerAuth()
@Controller('academic/curriculum')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurriculumController {
  constructor(private curriculumService: CurriculumService) {}

  @Get('matrix')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Get full curriculum matrix for an academic year' })
  getMatrix(
    @Query('academicYearId') academicYearId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.curriculumService.getCurriculumMatrix(academicYearId, userId, role);
  }

  @Post('matrix')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Add or update a curriculum mapping (subject ↔ class)' })
  upsertMapping(
    @Body() body: { academicYearId: string; subjectId: string; classSectionId: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.curriculumService.upsertCurriculumMapping(
      body.academicYearId,
      body.subjectId,
      body.classSectionId,
      userId,
      role,
    );
  }

  @Delete('matrix/:subjectId/:classSectionId')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Remove a curriculum mapping' })
  removeMapping(
    @Query('academicYearId') academicYearId: string,
    @Param('subjectId') subjectId: string,
    @Param('classSectionId') classSectionId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.curriculumService.removeCurriculumMapping(
      academicYearId,
      subjectId,
      classSectionId,
      userId,
      role,
    );
  }

  @Post('matrix/bulk')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Bulk upsert curriculum mappings' })
  bulkUpsert(
    @Body() body: { academicYearId: string; mappings: { subjectId: string; classSectionId: string }[] },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.curriculumService.bulkUpsert(
      body.academicYearId,
      body.mappings,
      userId,
      role,
    );
  }

  @Post('deploy')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Deploy curriculum for an academic year' })
  deploy(
    @Body() body: { academicYearId: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.curriculumService.deployCurriculum(body.academicYearId, userId, role);
  }

  @Get('deployment/status')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Get deployment status for an academic year' })
  getDeploymentStatus(@Query('academicYearId') academicYearId: string) {
    return this.curriculumService.getDeploymentStatus(academicYearId);
  }

  @Get('classes')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD, Role.TEACHER)
  @ApiOperation({ summary: 'Get all class sections with linked student previews' })
  async getAllClassesWithStudents(@CurrentUser() user: any) {
    return this.curriculumService.getAllClassesWithStudents(user);
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, AuditAction } from '@prisma/client';
import { Audit } from '../common/interceptors/audit.interceptor';
import { ReportsService } from './reports.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  GenerateReportCardDto,
  BatchGenerateDto,
  BuildTranscriptDto,
} from './dto/reports.dto';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReportGenerationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['SHS 1', 'SHS 2', 'SHS 3'])
  form?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  track?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classSectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

class SendNudgeDto {
  @ApiProperty()
  @IsString()
  classSectionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('report-cards/generate')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Generate report card for a single student' })
  generateOne(@Body() dto: GenerateReportCardDto) {
    return this.reportsService.generateReportCard(dto.studentId, dto.termId);
  }

  @Post('report-cards/batch')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Batch generate report cards for entire class' })
  batchGenerate(@Body() dto: BatchGenerateDto) {
    return this.reportsService.batchGenerateReportCards(
      dto.classSectionId,
      dto.termId,
    );
  }

  @Post('transcripts/generate')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Build 3-year transcript' })
  buildTranscript(@Body() dto: BuildTranscriptDto) {
    return this.reportsService.buildTranscript(dto.studentIdOrIndex);
  }

  @Public()
  @Get('verify/:hash')
  @ApiOperation({ summary: 'Verify document by QR hash (public)' })
  verify(@Param('hash') hash: string) {
    return this.reportsService.verifyDocument(hash);
  }

  @Get('generation/students')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get students for report generation with filters' })
  getStudentsForGeneration(@Query() query: ReportGenerationQueryDto) {
    return this.reportsService.getStudentsForGeneration(query);
  }

  @Post('generation/compile')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Compile batch reports for a class' })
  compileBatchReports(
    @Body() body: { classSectionId: string; termId: string },
  ) {
    return this.reportsService.batchGenerateReportCards(
      body.classSectionId,
      body.termId,
    );
  }

  @Get('generation/blocking-issues')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Get blocking issues for selected class' })
  getBlockingIssues(@Query('classSectionId') classSectionId: string) {
    return this.reportsService.getBlockingIssues(classSectionId);
  }

  @Post('generation/send-nudge')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Send nudge to teachers for missing marks' })
  @Audit(AuditAction.UPDATE, 'Nudge')
  sendNudgeToTeachers(
    @Body() dto: SendNudgeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.sendNudgeToTeachers(
      dto.classSectionId,
      dto.message,
      userId,
    );
  }
}

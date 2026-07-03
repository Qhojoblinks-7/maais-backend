import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MedicalService } from './medical.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Medical')
@ApiBearerAuth()
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalController {
  constructor(private readonly medicalService: MedicalService) {}

  @Get(':id/medical-records')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get medical records for a student' })
  getMedicalRecords(
    @Param('id') studentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.medicalService.getMedicalRecords(studentId, userId, role);
  }

  @Post(':id/medical-records')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Create a medical record for a student' })
  createMedicalRecord(@Param('id') studentId: string, @Body() data: any) {
    return this.medicalService.createMedicalRecord(studentId, data);
  }

  @Patch(':studentId/medical-records/:recordId')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Update a medical record' })
  updateMedicalRecord(
    @Param('studentId') studentId: string,
    @Param('recordId') recordId: string,
    @Body() data: any,
  ) {
    return this.medicalService.updateMedicalRecord(recordId, studentId, data);
  }

  @Delete(':studentId/medical-records/:recordId')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Delete a medical record' })
  deleteMedicalRecord(
    @Param('studentId') studentId: string,
    @Param('recordId') recordId: string,
  ) {
    return this.medicalService.deleteMedicalRecord(recordId, studentId);
  }
}

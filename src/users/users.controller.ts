import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService, CreateParentDto } from './users.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateStudentDto } from './dto/create-student.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('staff')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Create a staff account' })
  createStaff(@Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(dto);
  }

  @Post('students')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  createStudent(@Body() dto: CreateStudentDto) {
    return this.usersService.createStudent(dto);
  }

  @Post('parents')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Enrol a new parent' })
  createParent(@Body() dto: CreateParentDto) {
    return this.usersService.createParent(dto);
  }

  @Get('students')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD, Role.TEACHER)
  @ApiOperation({ summary: 'List all active students' })
  getAllStudents(@CurrentUser() user: { id: string; role: Role }) {
    return this.usersService.getAllStudents(user);
  }

  @Get('students/:id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.HEADMASTER,
    Role.HOD,
    Role.TEACHER,
    Role.STUDENT,
  )
  @ApiOperation({ summary: 'Get full student profile' })
  getStudentProfile(
    @Param('id') id: string,
    @CurrentUser('role') role: Role,
    @CurrentUser()
    user: { id: string; role: Role; staffProfile?: { id: string } },
  ) {
    const teacherStaffId =
      role === Role.TEACHER ? user?.staffProfile?.id : undefined;
    return this.usersService.getStudentProfile(id, role, teacherStaffId);
  }

  @Patch('students/:id')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update student profile (name, bio, DOB, photo)' })
  updateStudentProfile(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('role') role: Role,
  ) {
    return this.usersService.updateStudentProfile(id, body);
  }

  @Get('staff')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'List all staff members' })
  getAllStaff(@CurrentUser() user: { id: string; role: Role }) {
    return this.usersService.getAllStaff(user);
  }

  @Get('parents')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all parent accounts' })
  getAllParents() {
    return this.usersService.getAllParents();
  }

  @Delete(':id/deactivate')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER)
  @ApiOperation({ summary: 'Deactivate a user account' })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Post('students/batch')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD)
  @ApiOperation({ summary: 'Batch import students from CSSPS file' })
  batchImportStudents(@Body() body: { students: any[] }) {
    return this.usersService.batchImportStudents(body.students);
  }
}

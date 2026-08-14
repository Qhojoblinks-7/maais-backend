import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService, CreateParentDto } from './users.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { BulkImportStaffDto } from './dto/bulk-import-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('staff')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Create a staff account' })
  createStaff(@Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(dto);
  }

  @Post('staff/bulk')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Bulk import staff accounts' })
  bulkImportStaff(@Body() dto: BulkImportStaffDto) {
    return this.usersService.bulkImportStaff(dto.staff || []);
  }

  @Patch('staff/:id')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Update a staff account' })
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.usersService.updateStaff(id, dto);
  }

  @Post('students')
  @Roles(Role.HOD)
  createStudent(@Body() dto: CreateStudentDto) {
    return this.usersService.createStudent(dto);
  }

  @Post('parents')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Enrol a new parent' })
  createParent(@Body() dto: CreateParentDto) {
    return this.usersService.createParent(dto);
  }

  @Get('students')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all active students' })
  getAllStudents(
    @CurrentUser() user: { id: string; role: Role },
    @Query('search') search?: string,
  ) {
    return this.usersService.getAllStudents(user, search);
  }

  @Get('students/count')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get total active student count' })
  getStudentCount() {
    return this.usersService.getStudentCount();
  }

  @Get('staff/count')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get total staff count' })
  getStaffCount() {
    return this.usersService.getStaffCount();
  }

  @Get('students/boarder-stats')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get boarder vs day student counts' })
  getStudentBoarderStats() {
    return this.usersService.getStudentBoarderStats();
  }

  @Get('students/:id')
  @Roles(Role.STUDENT)
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
  @Roles(Role.HOD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update student profile (name, bio, DOB, photo)' })
  updateStudentProfile(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateStudentProfile(id, body);
  }

  @Get('staff')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all staff members' })
  getAllStaff(@CurrentUser() user: { id: string; role: Role }) {
    return this.usersService.getAllStaff(user);
  }

  @Get('staff/:id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get full staff/teacher profile' })
  getStaffProfile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.usersService.getStaffProfile(id, user);
  }

  @Get('teachers')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Search teachers by name' })
  searchTeachers(
    @CurrentUser() user: { id: string; role: Role },
    @Query('search') search?: string,
  ) {
    return this.usersService.searchTeachers(user, search);
  }

  @Get('parents')
  @Roles(Role.HOD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all parent accounts' })
  getAllParents() {
    return this.usersService.getAllParents();
  }

  @Get('parents/search')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Search parents by name, phone, or email' })
  searchParents(
    @CurrentUser() user: { id: string; role: Role },
    @Query('search') search?: string,
  ) {
    return this.usersService.searchParents(user, search);
  }

  @Delete(':id/deactivate')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Deactivate a user account' })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Get('me/context')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current user context for dual-role support' })
  getMyContext(@CurrentUser() user: { id: string; role: Role }) {
    return this.usersService.getMyContext(user);
  }

  @Post('students/batch')
  @Roles(Role.HOD)
  @ApiOperation({ summary: 'Batch import students from CSSPS file' })
  batchImportStudents(@Body() body: { students: any[] }) {
    return this.usersService.batchImportStudents(body.students);
  }
}

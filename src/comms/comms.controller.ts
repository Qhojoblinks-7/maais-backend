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
import { CommsService } from './comms.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import {
  SendNotificationDto,
  EmergencyNotificationDto,
  HODActionDto,
  TeacherActionDto,
} from './dto/comms.dto';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
import {
  UpdateTicketStatusDto,
  AddTicketReplyDto,
  TicketQueryDto,
} from './dto/ticket.dto';

@ApiTags('Comms')
@ApiBearerAuth()
@Controller('comms')
export class CommsController {
  constructor(private commsService: CommsService) {}

  @Post('notify')
  @Roles(Role.HEADMASTER, Role.SUPER_ADMIN, Role.HOD)
  @ApiOperation({ summary: 'Send notification to students' })
  sendNotification(
    @Body() dto: SendNotificationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.commsService.sendNotification(dto, userId);
  }

  @Post('emergency')
  @Roles(Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Broadcast emergency SMS to all parents' })
  emergency(
    @Body() dto: EmergencyNotificationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.commsService.broadcastEmergency(dto.title, dto.message, userId);
  }

  @Get('notifications/:studentId')
  @Roles(
    Role.STUDENT,
    Role.TEACHER,
    Role.HOD,
    Role.HEADMASTER,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: "Get student's notification inbox" })
  getNotifications(
    @Param('studentId') studentId: string,
    @Query('unreadOnly') _unreadOnly: boolean,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.commsService.getStudentNotifications(studentId, userId, role);
  }

  @Patch('notifications/:id/read')
  @Roles(
    Role.STUDENT,
    Role.TEACHER,
    Role.HOD,
    Role.HEADMASTER,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string) {
    return this.commsService.markAsRead(id);
  }

  @Get('notifications/unread')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get unread notifications for staff user' })
  getUnread(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.commsService.getUnreadForStaff(userId, role);
  }

  @Post('notifications/hod-action')
  @Roles(Role.TEACHER, Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send HOD action notification' })
  sendHODAction(@Body() dto: HODActionDto, @CurrentUser('id') userId: string) {
    return this.commsService.sendHODAction(
      dto.teacherId,
      dto.action,
      dto.details,
      userId,
    );
  }

  @Post('notifications/teacher-action')
  @Roles(Role.HOD, Role.HEADMASTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send teacher action notification' })
  sendTeacherAction(
    @Body() dto: TeacherActionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.commsService.sendTeacherAction(
      dto.recordId,
      dto.action,
      dto.message,
      dto.className,
      userId,
    );
  }

  @Get('analytics/pulse')
  @Roles(Role.HEADMASTER, Role.SUPER_ADMIN, Role.HOD, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get academic pulse dashboard data' })
  getPulse(
    @Query('academicYearId') academicYearId?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.commsService.getAnalyticsPulse(academicYearId, userId);
  }

  @Post('tickets')
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Raise a support ticket (student-facing)' })
  createTicket(
    @Body() dto: CreateSupportTicketDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.commsService.createTicket(dto, userId);
  }

  @Get('tickets/my')
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current student's support tickets" })
  getMyTickets(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.commsService.listTickets({}, userId, role);
  }

  @Get('tickets')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tickets (filtered by role)' })
  listTickets(
    @Query() query: TicketQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.commsService.listTickets(query, userId, role);
  }

  @Patch('tickets/:id/status')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket status and notes' })
  updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.commsService.updateTicketStatus(id, dto, userId, role);
  }

  @Post('tickets/:id/reply')
  @Roles(Role.SUPER_ADMIN, Role.HEADMASTER, Role.HOD, Role.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a reply to a ticket' })
  addReply(
    @Param('id') id: string,
    @Body() dto: AddTicketReplyDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.commsService.addTicketReply(id, dto, userId, role);
  }
}

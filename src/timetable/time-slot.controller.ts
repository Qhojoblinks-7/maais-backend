import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TimeSlotService } from './time-slot.service';
import { Roles, CurrentUser } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('TimeSlot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-slots')
export class TimeSlotController {
  constructor(private timeSlotService: TimeSlotService) {}

  @Get()
  @Roles(Role.HEADMASTER, Role.HOD, Role.TEACHER, Role.STUDENT)
  @ApiOperation({
    summary: 'Get all active time slots (readable by all roles)',
  })
  findAll() {
    return this.timeSlotService.findAll();
  }

  @Post()
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Create a new time slot (admin only)' })
  create(
    @Body()
    body: {
      label: string;
      startTime: string;
      endTime: string;
      isBreak?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.timeSlotService.create(body);
  }

  @Put(':id')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Update a time slot (admin only)' })
  update(
    @Param('id') id: string,
    @Body()
    body: {
      label?: string;
      startTime?: string;
      endTime?: string;
      isBreak?: boolean;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.timeSlotService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Delete a time slot (admin only)' })
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.timeSlotService.delete(id, user.id);
  }

  @Post('reorder')
  @Roles(Role.HEADMASTER)
  @ApiOperation({ summary: 'Reorder time slots (admin only)' })
  reorder(@Body() body: { ids: string[] }) {
    return this.timeSlotService.reorder(body.ids);
  }
}

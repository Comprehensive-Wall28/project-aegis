import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
} from './dto/calendar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    if (limit || cursor) {
      // Default limit to 50 if not provided but cursor is provided
      const limitVal = limit ? Number(limit) : 50;
      return this.calendarService.getPaginatedEvents(req.user.userId, {
        limit: limitVal,
        cursor,
      });
    }
    return this.calendarService.getEvents(req.user.userId, start, end);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() createCalendarEventDto: CreateCalendarEventDto,
  ) {
    return this.calendarService.createEvent(
      req.user.userId,
      createCalendarEventDto,
      req,
    );
  }

  @Put(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateCalendarEventDto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.updateEvent(
      req.user.userId,
      id,
      updateCalendarEventDto,
      req,
    );
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.calendarService.deleteEvent(req.user.userId, id, req);
  }
}

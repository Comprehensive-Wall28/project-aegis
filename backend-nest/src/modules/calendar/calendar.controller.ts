import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Get()
    findAll(@Request() req: any, @Query('start') start?: string, @Query('end') end?: string) {
        return this.calendarService.getEvents(req.user.userId, start, end);
    }

    @Post()
    create(@Request() req: any, @Body() createCalendarEventDto: CreateCalendarEventDto) {
        return this.calendarService.createEvent(req.user.userId, createCalendarEventDto, req);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateCalendarEventDto: UpdateCalendarEventDto) {
        return this.calendarService.updateEvent(req.user.userId, id, updateCalendarEventDto, req);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.calendarService.deleteEvent(req.user.userId, id, req);
    }
}

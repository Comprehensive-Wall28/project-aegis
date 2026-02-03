import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    HttpCode
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFilterDto } from './dto/event-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Get()
    async getEvents(
        @CurrentUser() user: any,
        @Query() filters: EventFilterDto
    ) {
        if (filters.limit !== undefined || filters.cursor !== undefined) {
            return this.calendarService.getPaginatedEvents(user.id, {
                limit: filters.limit || 50,
                cursor: filters.cursor
            });
        }

        return this.calendarService.getEvents(user.id, filters);
    }

    @Post()
    @UseGuards(CsrfGuard)
    @HttpCode(HttpStatus.CREATED)
    async createEvent(
        @CurrentUser() user: any,
        @Body() createEventDto: CreateEventDto
    ) {
        return this.calendarService.createEvent(user.id, createEventDto);
    }

    @Put(':id')
    @UseGuards(CsrfGuard)
    async updateEvent(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() updateEventDto: UpdateEventDto
    ) {
        return this.calendarService.updateEvent(user.id, id, updateEventDto);
    }

    @Delete(':id')
    @UseGuards(CsrfGuard)
    async deleteEvent(
        @CurrentUser() user: any,
        @Param('id') id: string
    ) {
        await this.calendarService.deleteEvent(user.id, id);
        return { message: 'Event deleted successfully' };
    }
}

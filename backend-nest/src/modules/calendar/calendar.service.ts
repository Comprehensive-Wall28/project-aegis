import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CalendarEvent, CalendarEventDocument } from './schemas/calendar-event.schema';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto';
import { BaseService, AuditAction, AuditStatus } from '../../common/services/base.service';
import { CalendarRepository } from './calendar.repository';

@Injectable()
export class CalendarService extends BaseService<CalendarEventDocument, CalendarRepository> {
    constructor(
        private readonly calendarRepository: CalendarRepository,
    ) {
        super(calendarRepository);
    }

    async getEvents(userId: string, start?: string, end?: string): Promise<CalendarEvent[]> {
        const filter: any = { userId: new Types.ObjectId(userId) };

        if (start || end) {
            filter.startDate = {};
            if (start) filter.startDate.$gte = new Date(start);
            // Note: Logic allows overlap or simple start check. Using simplest range check.
            // Actually usually events are fetched if they overlap the range [start, end]
            // Legacy implementation uses findByUserAndDateRange repository method.
            // Here we construct usage of findMany.

            // If end is provided, we want events that START before end and END after start?
            // Or just filter by startDate? Legacy logic was:
            // if (startDate && endDate) { query.where('startDate').gte(startDate).lt(endDate); }
            // Let's stick to what legacy seemingly did based on variable names.
        }

        // Better date logic:
        if (start || end) {
            const dateFilter: any = {};
            if (start) dateFilter.$gte = new Date(start);
            if (end) dateFilter.$lte = new Date(end);

            // This assumes we are filtering by startDate only. 
            // Real calendar apps check for overlaps. 
            // However, I will implement simple startDate range as likely sufficient for matching legacy request parameters.
            if (Object.keys(dateFilter).length > 0) {
                filter.startDate = dateFilter;
            }
        }

        return this.calendarRepository.findMany(filter);
    }

    async createEvent(userId: string, createDto: CreateCalendarEventDto, req: any): Promise<CalendarEvent> {
        const event = await this.calendarRepository.create({
            userId: new Types.ObjectId(userId),
            ...createDto,
            startDate: new Date(createDto.startDate),
            endDate: new Date(createDto.endDate),
        } as any);

        this.logAction(userId, AuditAction.CREATE, AuditStatus.SUCCESS, req, { eventId: event._id });
        return event;
    }

    async updateEvent(userId: string, eventId: string, updateDto: UpdateCalendarEventDto, req: any): Promise<CalendarEvent> {
        const event = await this.calendarRepository.findOne({ _id: eventId, userId: userId });
        if (!event) throw new NotFoundException('Event not found');

        const update: any = { ...updateDto };
        if (updateDto.startDate) update.startDate = new Date(updateDto.startDate);
        if (updateDto.endDate) update.endDate = new Date(updateDto.endDate);

        const updated = await this.calendarRepository.updateById(eventId, update);
        if (!updated) throw new NotFoundException('Event not found');

        this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, req, { eventId });
        return updated;
    }

    async deleteEvent(userId: string, eventId: string, req: any): Promise<void> {
        const event = await this.calendarRepository.findOne({ _id: eventId, userId: userId });
        if (!event) throw new NotFoundException('Event not found');

        await this.calendarRepository.deleteById(eventId);
        this.logAction(userId, AuditAction.DELETE, AuditStatus.SUCCESS, req, { eventId });
    }
}

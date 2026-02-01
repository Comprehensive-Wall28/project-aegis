import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CalendarEvent,
  CalendarEventDocument,
} from './schemas/calendar-event.schema';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
} from './dto/calendar.dto';
import {
  BaseService,
  AuditAction,
  AuditStatus,
} from '../../common/services/base.service';
import { CalendarRepository } from './calendar.repository';

@Injectable()
export class CalendarService extends BaseService<
  CalendarEventDocument,
  CalendarRepository
> {
  constructor(private readonly calendarRepository: CalendarRepository) {
    super(calendarRepository);
  }

  async getEvents(
    userId: string,
    start?: string,
    end?: string,
  ): Promise<CalendarEvent[]> {
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;
    return this.calendarRepository.findByUserAndDateRange(
      userId,
      startDate,
      endDate,
    );
  }

  async getPaginatedEvents(
    userId: string,
    options: { limit: number; cursor?: string },
  ): Promise<{ items: CalendarEvent[]; nextCursor: string | null }> {
    return this.calendarRepository.findPaginated(
      { userId: new Types.ObjectId(userId) },
      {
        limit: Math.min(options.limit || 50, 100),
        cursor: options.cursor,
        sortField: '_id',
        sortOrder: -1, // Most recent first
      },
    );
  }

  async createEvent(
    userId: string,
    createDto: CreateCalendarEventDto,
    req: any,
  ): Promise<CalendarEvent> {
    const event = await this.calendarRepository.create({
      userId: new Types.ObjectId(userId),
      ...createDto,
      startDate: new Date(createDto.startDate),
      endDate: new Date(createDto.endDate),
    } as any);

    this.logAction(
      userId,
      AuditAction.CALENDAR_CREATE,
      AuditStatus.SUCCESS,
      req,
      { eventId: event._id },
    );
    return event;
  }

  async updateEvent(
    userId: string,
    eventId: string,
    updateDto: UpdateCalendarEventDto,
    req: any,
  ): Promise<CalendarEvent> {
    const update: any = { ...updateDto };
    if (updateDto.startDate) update.startDate = new Date(updateDto.startDate);
    if (updateDto.endDate) update.endDate = new Date(updateDto.endDate);

    const updated = await this.calendarRepository.updateByIdAndUser(
      eventId,
      userId,
      update,
    );
    if (!updated) throw new NotFoundException('Event not found');

    this.logAction(
      userId,
      AuditAction.CALENDAR_UPDATE,
      AuditStatus.SUCCESS,
      req,
      { eventId },
    );
    return updated;
  }

  async deleteEvent(userId: string, eventId: string, req: any): Promise<void> {
    const deleted = await this.calendarRepository.deleteByIdAndUser(
      eventId,
      userId,
    );
    if (!deleted) throw new NotFoundException('Event not found');

    this.logAction(
      userId,
      AuditAction.CALENDAR_DELETE,
      AuditStatus.SUCCESS,
      req,
      { eventId },
    );
  }
}

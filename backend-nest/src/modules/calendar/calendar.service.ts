import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/services/base.service';
import { CalendarEventDocument } from './calendar.schema';
import { CalendarEventRepository } from './calendar.repository';
import { ServiceError } from '../../common/services/service.error';
import { AuditAction, AuditStatus } from '../../common/services/base.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFilterDto } from './dto/event-filter.dto';

@Injectable()
export class CalendarService extends BaseService<CalendarEventDocument, CalendarEventRepository> {
    constructor(protected readonly calendarEventRepository: CalendarEventRepository) {
        super(calendarEventRepository);
    }

    /**
     * Get events for user with optional date range filter
     */
    async getEvents(
        userId: string,
        filters: EventFilterDto
    ): Promise<CalendarEventDocument[]> {
        try {
            const startDate = filters.start ? new Date(filters.start) : undefined;
            const endDate = filters.end ? new Date(filters.end) : undefined;

            return await this.repository.findByUserAndDateRange(userId, startDate, endDate);
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Create a new calendar event
     */
    async createEvent(
        userId: string,
        data: CreateEventDto
    ): Promise<CalendarEventDocument> {
        try {
            // Validate required fields
            this.validateRequired(data as any, [
                'encryptedData',
                'encapsulatedKey',
                'encryptedSymmetricKey',
                'startDate',
                'endDate',
                'recordHash'
            ]);

            const event = await this.repository.create({
                userId: userId as any,
                encryptedData: data.encryptedData,
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isAllDay: data.isAllDay ?? false,
                color: data.color ?? '#3f51b5',
                recordHash: data.recordHash,
                mentions: data.mentions || []
            });

            // Audit log
            this.logAction(userId, AuditAction.CREATE, AuditStatus.SUCCESS, {
                entityType: 'CALENDAR_EVENT',
                entityId: event._id.toString()
            });

            return event;
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Update a calendar event
     */
    async updateEvent(
        userId: string,
        eventId: string,
        data: UpdateEventDto
    ): Promise<CalendarEventDocument> {
        try {
            const validatedId = this.validateId(eventId, 'event ID');

            // Build update object
            const updateData: Partial<CalendarEventDocument> = {};

            // Copy encrypted fields if provided
            if (data.encryptedData) updateData.encryptedData = data.encryptedData;
            if (data.encapsulatedKey) updateData.encapsulatedKey = data.encapsulatedKey;
            if (data.encryptedSymmetricKey) updateData.encryptedSymmetricKey = data.encryptedSymmetricKey;
            if (data.recordHash) updateData.recordHash = data.recordHash;

            // Convert dates if provided
            if (data.startDate) {
                updateData.startDate = new Date(data.startDate);
            }
            if (data.endDate) {
                updateData.endDate = new Date(data.endDate);
            }

            // Set other fields if provided
            if (data.isAllDay !== undefined) {
                updateData.isAllDay = data.isAllDay;
            }
            if (data.color) {
                updateData.color = data.color;
            }
            if (data.mentions) {
                updateData.mentions = data.mentions;
            }

            const event = await this.repository.updateByIdAndUser(
                validatedId,
                userId,
                updateData
            );

            if (!event) {
                throw new ServiceError('Event not found', 404, 'NOT_FOUND');
            }

            this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, {
                entityType: 'CALENDAR_EVENT',
                entityId: validatedId
            });

            return event;
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Delete a calendar event
     */
    async deleteEvent(
        userId: string,
        eventId: string
    ): Promise<void> {
        try {
            const validatedId = this.validateId(eventId, 'event ID');

            const deleted = await this.repository.deleteByIdAndUser(validatedId, userId);

            if (!deleted) {
                throw new ServiceError('Event not found', 404, 'NOT_FOUND');
            }

            this.logAction(userId, AuditAction.DELETE, AuditStatus.SUCCESS, {
                entityType: 'CALENDAR_EVENT',
                entityId: validatedId
            });
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }

    /**
     * Get paginated events for a user
     */
    async getPaginatedEvents(
        userId: string,
        options: { limit: number; cursor?: string }
    ): Promise<{ items: CalendarEventDocument[]; nextCursor: string | null }> {
        try {
            return await this.repository.findPaginated(
                { userId: { $eq: userId } } as any,
                {
                    limit: Math.min(options.limit || 50, 100),
                    cursor: options.cursor,
                    sortField: '_id',
                    sortOrder: -1 // Most recent first
                }
            );
        } catch (error) {
            this.handleRepositoryError(error);
        }
    }
}

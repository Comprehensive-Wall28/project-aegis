import { Request } from 'express';
import { BaseService, ServiceError } from './base/BaseService';
import { CalendarEventRepository } from '../repositories/CalendarEventRepository';
import { ICalendarEvent } from '../models/CalendarEvent';
import logger from '../utils/logger';
import { withCache, CacheInvalidator } from '../utils/cacheUtils';
import CacheKeyBuilder from './cache/CacheKeyBuilder';

/**
 * DTO for creating a calendar event
 */
export interface CreateCalendarEventDTO {
    encryptedData: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    startDate: string | Date;
    endDate: string | Date;
    isAllDay?: boolean;
    color?: string;
    recordHash: string;
    mentions?: string[];
}

/**
 * CalendarService handles calendar event business logic
 */
export class CalendarService extends BaseService<ICalendarEvent, CalendarEventRepository> {
    constructor() {
        super(new CalendarEventRepository());
    }

    /**
     * Get events for user with optional date range filter (cached)
     */
    async getEvents(
        userId: string,
        start?: string,
        end?: string
    ): Promise<ICalendarEvent[]> {
        try {
            const cacheKey = CacheKeyBuilder.calendarRange(userId, start || 'all', end || 'all');
            
            return await withCache(
                { key: cacheKey, ttl: 300000 }, // 5 minutes
                async () => {
                    const startDate = start ? new Date(start) : undefined;
                    const endDate = end ? new Date(end) : undefined;
                    return await this.repository.findByUserAndDateRange(userId, startDate, endDate);
                }
            );
        } catch (error) {
            logger.error('Get events error:', error);
            throw new ServiceError('Failed to fetch events', 500);
        }
    }

    /**
     * Create a new calendar event
     */
    async createEvent(
        userId: string,
        data: CreateCalendarEventDTO,
        req: Request
    ): Promise<ICalendarEvent> {
        try {
            if (!data.encryptedData || !data.encapsulatedKey || !data.encryptedSymmetricKey ||
                !data.startDate || !data.endDate || !data.recordHash) {
                throw new ServiceError('Missing required fields', 400);
            }

            const event = await this.repository.create({
                userId: userId as any,
                encryptedData: data.encryptedData,
                encapsulatedKey: data.encapsulatedKey,
                encryptedSymmetricKey: data.encryptedSymmetricKey,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isAllDay: data.isAllDay || false,
                color: data.color || '#3f51b5',
                recordHash: data.recordHash,
                mentions: data.mentions || []
            } as any);


            await this.logAction(userId, 'CALENDAR_EVENT_CREATE', 'SUCCESS', req, {
                eventId: event._id.toString()
            });

            // Invalidate calendar caches for this user
            CacheInvalidator.userCalendar(userId);

            return event;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Create event error:', error);
            throw new ServiceError('Failed to create event', 500);
        }
    }

    /**
     * Update a calendar event
     */
    async updateEvent(
        userId: string,
        eventId: string,
        data: Partial<CreateCalendarEventDTO>,
        req: Request
    ): Promise<ICalendarEvent> {
        try {
            const updateData: any = { ...data };

            // Convert date strings to Date objects if present
            if (data.startDate) updateData.startDate = new Date(data.startDate);
            if (data.endDate) updateData.endDate = new Date(data.endDate);
            if (data.mentions) updateData.mentions = data.mentions;

            const event = await this.repository.updateByIdAndUser(eventId, userId, updateData);

            if (!event) {
                throw new ServiceError('Event not found', 404);
            }


            await this.logAction(userId, 'CALENDAR_EVENT_UPDATE', 'SUCCESS', req, {
                eventId
            });

            // Invalidate calendar caches for this user
            CacheInvalidator.userCalendar(userId);

            return event;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Update event error:', error);
            throw new ServiceError('Failed to update event', 500);
        }
    }

    /**
     * Delete a calendar event
     */
    async deleteEvent(userId: string, eventId: string, req: Request): Promise<void> {
        try {
            const deleted = await this.repository.deleteByIdAndUser(eventId, userId);

            if (!deleted) {
                throw new ServiceError('Event not found', 404);
            }


            await this.logAction(userId, 'CALENDAR_EVENT_DELETE', 'SUCCESS', req, {
                eventId
            });

            // Invalidate calendar caches for this user
            CacheInvalidator.userCalendar(userId);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Delete event error:', error);
            throw new ServiceError('Failed to delete event', 500);
        }
    }

    /**
     * Get paginated events for a user (cached)
     */
    async getPaginatedEvents(
        userId: string,
        options: { limit: number; cursor?: string }
    ): Promise<{ items: ICalendarEvent[]; nextCursor: string | null }> {
        try {
            const cacheKey = CacheKeyBuilder.calendarPaginated(userId, options.cursor) + 
                `:limit_${Math.min(options.limit || 50, 100)}`;
            
            return await withCache(
                { key: cacheKey, ttl: 300000 }, // 5 minutes
                async () => {
                    return await this.repository.findPaginated(
                        { userId: { $eq: userId } } as any,
                        {
                            limit: Math.min(options.limit || 50, 100),
                            cursor: options.cursor,
                            sortField: '_id',
                            sortOrder: -1 // Most recent first
                        }
                    );
                }
            );
        } catch (error) {
            logger.error('Get paginated events error:', error);
            throw new ServiceError('Failed to fetch events', 500);
        }
    }
}

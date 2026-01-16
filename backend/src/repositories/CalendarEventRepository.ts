import { BaseRepository } from './base/BaseRepository';
import CalendarEvent, { ICalendarEvent } from '../models/CalendarEvent';
import { SafeFilter } from './base/types';

/**
 * CalendarEventRepository handles CalendarEvent database operations
 */
export class CalendarEventRepository extends BaseRepository<ICalendarEvent> {
    constructor() {
        super(CalendarEvent);
    }

    /**
     * Find events by user with optional date range
     */
    async findByUserAndDateRange(
        userId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<ICalendarEvent[]> {
        const filter: any = { userId: { $eq: userId } };

        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = startDate;
            if (endDate) filter.startDate.$lte = endDate;
        }

        return this.findMany(filter as unknown as SafeFilter<ICalendarEvent>, {
            sort: { startDate: 1 }
        });
    }

    /**
     * Find event by ID and user
     */
    async findByIdAndUser(eventId: string, userId: string): Promise<ICalendarEvent | null> {
        return this.findOne({
            _id: { $eq: eventId },
            userId: { $eq: userId }
        } as unknown as SafeFilter<ICalendarEvent>);
    }

    /**
     * Update event by ID and user
     */
    async updateByIdAndUser(
        eventId: string,
        userId: string,
        data: Partial<ICalendarEvent>
    ): Promise<ICalendarEvent | null> {
        // Remove userId from update data
        const { userId: _, ...updateData } = data as any;

        return this.updateOne(
            {
                _id: { $eq: eventId },
                userId: { $eq: userId }
            } as unknown as SafeFilter<ICalendarEvent>,
            { $set: updateData },
            { returnNew: true }
        );
    }

    /**
     * Delete event by ID and user
     */
    async deleteByIdAndUser(eventId: string, userId: string): Promise<boolean> {
        return this.deleteOne({
            _id: { $eq: eventId },
            userId: { $eq: userId }
        } as unknown as SafeFilter<ICalendarEvent>);
    }
}

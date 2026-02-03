import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/database/base.repository';
import { CalendarEvent, CalendarEventDocument } from './calendar.schema';
import { QueryOptions, SafeFilter } from '../../common/database/types';

@Injectable()
export class CalendarEventRepository extends BaseRepository<CalendarEventDocument> {
    constructor(@InjectModel(CalendarEvent.name) private eventModel: Model<CalendarEventDocument>) {
        super(eventModel);
    }

    /**
     * Find events by user with optional date range
     */
    async findByUserAndDateRange(
        userId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<CalendarEventDocument[]> {
        const filter: SafeFilter<CalendarEventDocument> = {
            userId: { $eq: userId } as any
        };

        if (startDate || endDate) {
            (filter as any).startDate = {};
            if (startDate) (filter as any).startDate.$gte = startDate;
            if (endDate) (filter as any).startDate.$lte = endDate;
        }

        return this.findMany(filter, {
            sort: { startDate: 1 }
        });
    }

    /**
     * Find event by ID and user
     */
    async findByIdAndUser(eventId: string, userId: string): Promise<CalendarEventDocument | null> {
        return this.findOne({
            _id: { $eq: eventId } as any,
            userId: { $eq: userId } as any
        });
    }

    /**
     * Update event by ID and user
     */
    async updateByIdAndUser(
        eventId: string,
        userId: string,
        data: Partial<CalendarEventDocument>
    ): Promise<CalendarEventDocument | null> {
        // Remove userId from update data
        const { userId: _, ...updateData } = data as any;

        return this.updateOne(
            {
                _id: eventId,
                userId: { $eq: userId } as any
            },
            { $set: updateData },
            { returnNew: true }
        );
    }

    /**
     * Delete event by ID and user
     */
    async deleteByIdAndUser(eventId: string, userId: string): Promise<boolean> {
        return this.deleteOne({
            _id: eventId,
            userId: { $eq: userId } as any
        });
    }

    /**
     * Find all events that mention a specific entity ID
     */
    async findMentionsOf(userId: string, targetId: string): Promise<CalendarEventDocument[]> {
        return this.findMany({
            userId: { $eq: userId } as any,
            mentions: { $in: [targetId] } as any
        });
    }
}

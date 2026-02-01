import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { CalendarEvent, CalendarEventDocument } from './schemas/calendar-event.schema';
import { SafeFilter } from '../../common/repositories/types';

@Injectable()
export class CalendarRepository extends BaseRepository<CalendarEventDocument> {
    constructor(@InjectModel(CalendarEvent.name) model: Model<CalendarEventDocument>) {
        super(model);
    }

    async findByUserAndDateRange(
        userId: string | Types.ObjectId,
        startDate?: Date,
        endDate?: Date
    ): Promise<CalendarEventDocument[]> {
        const filter: any = { userId: new Types.ObjectId(userId) };

        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = startDate;
            if (endDate) filter.startDate.$lte = endDate;
        }

        return this.findMany(filter, {
            sort: { startDate: 1 }
        });
    }

    async findByIdAndUser(eventId: string, userId: string | Types.ObjectId): Promise<CalendarEventDocument | null> {
        return this.findOne({
            _id: new Types.ObjectId(eventId),
            userId: new Types.ObjectId(userId)
        } as unknown as SafeFilter<CalendarEventDocument>);
    }

    async updateByIdAndUser(
        eventId: string,
        userId: string | Types.ObjectId,
        data: Partial<CalendarEventDocument>
    ): Promise<CalendarEventDocument | null> {
        // Remove userId from update data to prevent changing ownership
        const { userId: _, ...updateData } = data as any;

        return this.updateOne(
            {
                _id: new Types.ObjectId(eventId),
                userId: new Types.ObjectId(userId)
            } as unknown as SafeFilter<CalendarEventDocument>,
            { $set: updateData },
            { returnNew: true }
        );
    }

    async deleteByIdAndUser(eventId: string, userId: string | Types.ObjectId): Promise<boolean> {
        return this.deleteOne({
            _id: new Types.ObjectId(eventId),
            userId: new Types.ObjectId(userId)
        } as unknown as SafeFilter<CalendarEventDocument>);
    }

    async findMentionsOf(userId: string | Types.ObjectId, targetId: string): Promise<CalendarEventDocument[]> {
        return this.findMany({
            userId: new Types.ObjectId(userId),
            mentions: { $in: [targetId] }
        } as unknown as SafeFilter<CalendarEventDocument>);
    }
}

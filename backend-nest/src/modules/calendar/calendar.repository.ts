import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { CalendarEvent, CalendarEventDocument } from './schemas/calendar-event.schema';

@Injectable()
export class CalendarRepository extends BaseRepository<CalendarEventDocument> {
    constructor(@InjectModel(CalendarEvent.name) model: Model<CalendarEventDocument>) {
        super(model);
    }
}

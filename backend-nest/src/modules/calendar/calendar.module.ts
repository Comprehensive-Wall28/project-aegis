import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { CalendarEvent, CalendarEventSchema } from './schemas/calendar-event.schema';
import { CalendarRepository } from './calendar.repository';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: CalendarEvent.name, schema: CalendarEventSchema }]),
    ],
    controllers: [CalendarController],
    providers: [CalendarService, CalendarRepository],
    exports: [CalendarService],
})
export class CalendarModule { }

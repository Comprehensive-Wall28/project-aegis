import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarEvent, CalendarEventSchema } from './calendar.schema';
import { CalendarEventRepository } from './calendar.repository';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: CalendarEvent.name, schema: CalendarEventSchema }]),
        AuthModule
    ],
    controllers: [CalendarController],
    providers: [CalendarEventRepository, CalendarService],
    exports: [CalendarService]
})
export class CalendarModule { }

import { Module } from '@nestjs/common';
import { MentionController } from './mention.controller';
import { MentionService } from './mention.service';
import { TasksModule } from '../tasks/tasks.module';
import { CalendarModule } from '../calendar/calendar.module';
import { NotesModule } from '../notes/notes.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TasksModule,
        CalendarModule,
        NotesModule,
        UsersModule,
    ],
    controllers: [MentionController],
    providers: [MentionService],
    exports: [MentionService],
})
export class MentionModule { }

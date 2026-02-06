import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { RoomRepository } from './repositories/room.repository';
import { Room, RoomSchema } from './schemas/room.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Room.name, schema: RoomSchema },
        ], 'primary'),
        AuthModule,
    ],
    controllers: [SocialController],
    providers: [SocialService, RoomRepository],
    exports: [SocialService, RoomRepository],
})
export class SocialModule { }

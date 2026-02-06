import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { RoomRepository } from './repositories/room.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { Room, RoomSchema } from './schemas/room.schema';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Room.name, schema: RoomSchema },
            { name: Collection.name, schema: CollectionSchema },
        ], 'primary'),
        AuthModule,
    ],
    controllers: [SocialController],
    providers: [SocialService, RoomRepository, CollectionRepository],
    exports: [SocialService, RoomRepository, CollectionRepository],
})
export class SocialModule { }

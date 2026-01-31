import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { SocialRepository } from './social.repository';
import { CollectionRepository } from './collection.repository';
import { Room, RoomSchema } from './schemas/room.schema';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { AuditService } from '../../common/services/audit.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Room.name, schema: RoomSchema },
            { name: Collection.name, schema: CollectionSchema },
        ]),
    ],
    providers: [
        SocialService,
        ScraperService,
        SocialRepository,
        CollectionRepository,
        AuditService,
    ],
    controllers: [
        SocialController,
        ScraperController,
    ],
    exports: [SocialService, ScraperService],
})
export class SocialModule { }

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialController } from './social.controller';
import { SocialRoomsController } from './social.controller';
import { SocialService } from './social.service';
import { RoomRepository } from './repositories/room.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { LinkPostRepository } from './repositories/link-post.repository';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { LinkViewRepository } from './repositories/link-view.repository';
import { ReaderAnnotationRepository } from './repositories/reader-annotation.repository';
import { Room, RoomSchema } from './schemas/room.schema';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { LinkPost, LinkPostSchema } from './schemas/link-post.schema';
import { LinkComment, LinkCommentSchema } from './schemas/link-comment.schema';
import { LinkView, LinkViewSchema } from './schemas/link-view.schema';
import { ReaderAnnotation, ReaderAnnotationSchema } from './schemas/reader-annotation.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Room.name, schema: RoomSchema },
            { name: Collection.name, schema: CollectionSchema },
            { name: LinkPost.name, schema: LinkPostSchema },
            { name: LinkComment.name, schema: LinkCommentSchema },
            { name: LinkView.name, schema: LinkViewSchema },
            { name: ReaderAnnotation.name, schema: ReaderAnnotationSchema },
        ], 'primary'),
        AuthModule,
    ],
    controllers: [SocialController, SocialRoomsController],
    providers: [
        SocialService,
        RoomRepository,
        CollectionRepository,
        LinkPostRepository,
        LinkCommentRepository,
        LinkViewRepository,
        ReaderAnnotationRepository,
    ],
    exports: [
        SocialService,
        RoomRepository,
        CollectionRepository,
        LinkPostRepository,
        LinkCommentRepository,
        LinkViewRepository,
        ReaderAnnotationRepository,
    ],
})
export class SocialModule { }

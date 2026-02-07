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
import { LinkMetadataRepository } from './repositories/link-metadata.repository';
import { ReaderContentCacheRepository } from './repositories/reader-content-cache.repository';
import { Room, RoomSchema } from './schemas/room.schema';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { LinkPost, LinkPostSchema } from './schemas/link-post.schema';
import { LinkComment, LinkCommentSchema } from './schemas/link-comment.schema';
import { LinkView, LinkViewSchema } from './schemas/link-view.schema';
import {
  ReaderAnnotation,
  ReaderAnnotationSchema,
} from './schemas/reader-annotation.schema';
import {
  LinkMetadata,
  LinkMetadataSchema,
} from './schemas/link-metadata.schema';
import {
  ReaderContentCache,
  ReaderContentCacheSchema,
} from './schemas/reader-content-cache.schema';
import { ScraperService } from './services/scraper/scraper.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Room.name, schema: RoomSchema },
        { name: Collection.name, schema: CollectionSchema },
        { name: LinkPost.name, schema: LinkPostSchema },
        { name: LinkComment.name, schema: LinkCommentSchema },
        { name: LinkView.name, schema: LinkViewSchema },
        { name: ReaderAnnotation.name, schema: ReaderAnnotationSchema },
        { name: LinkMetadata.name, schema: LinkMetadataSchema },
        { name: ReaderContentCache.name, schema: ReaderContentCacheSchema },
      ],
      'primary',
    ),
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
    LinkMetadataRepository,
    ReaderContentCacheRepository,
    ScraperService,
  ],
  exports: [
    SocialService,
    RoomRepository,
    CollectionRepository,
    LinkPostRepository,
    LinkCommentRepository,
    LinkViewRepository,
    ReaderAnnotationRepository,
    LinkMetadataRepository,
    ReaderContentCacheRepository,
    ScraperService,
  ],
})
export class SocialModule {}

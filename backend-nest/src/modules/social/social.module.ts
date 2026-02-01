import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialService } from './social.service';
import { LinkService } from './link.service';
import { CommentService } from './comment.service';
import { ImageProxyService } from './image-proxy.service';
import { SocialController } from './social.controller';
import { ReaderService } from './reader.service';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { SocialRepository } from './social.repository';
import { CollectionRepository } from './collection.repository';
import { LinkPostRepository } from './repositories/link-post.repository';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { LinkViewRepository } from './repositories/link-view.repository';
import { LinkMetadataRepository } from './repositories/link-metadata.repository';
import { CachedImageRepository } from './repositories/cached-image.repository';
import { ReaderAnnotationRepository } from './repositories/reader-annotation.repository';
import { ReaderContentCacheRepository } from './repositories/reader-content-cache.repository';
import { LinkAccessHelper } from './utils/link-access.helper';
import { Room, RoomSchema } from './schemas/room.schema';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { LinkPost, LinkPostSchema } from './schemas/link-post.schema';
import { LinkComment, LinkCommentSchema } from './schemas/link-comment.schema';
import { LinkView, LinkViewSchema } from './schemas/link-view.schema';
import {
  LinkMetadata,
  LinkMetadataSchema,
} from './schemas/link-metadata.schema';
import { CachedImage, CachedImageSchema } from './schemas/cached-image.schema';
import {
  ReaderAnnotation,
  ReaderAnnotationSchema,
} from './schemas/reader-annotation.schema';
import {
  ReaderContentCache,
  ReaderContentCacheSchema,
} from './schemas/reader-content-cache.schema';
import { AuditService } from '../../common/services/audit.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { GridFsService } from '../vault/gridfs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Collection.name, schema: CollectionSchema },
      { name: LinkPost.name, schema: LinkPostSchema },
      { name: LinkComment.name, schema: LinkCommentSchema },
      { name: CachedImage.name, schema: CachedImageSchema },
      { name: ReaderAnnotation.name, schema: ReaderAnnotationSchema },
    ]),
    MongooseModule.forFeature(
      [
        { name: LinkView.name, schema: LinkViewSchema },
        { name: LinkMetadata.name, schema: LinkMetadataSchema },
        { name: ReaderContentCache.name, schema: ReaderContentCacheSchema },
      ],
      'audit', // Use secondary (audit) connection for cache/metadata
    ),
    WebsocketModule,
  ],
  providers: [
    SocialService,
    LinkService,
    CommentService,
    ImageProxyService,
    ReaderService,
    ScraperService,
    SocialRepository,
    CollectionRepository,
    LinkPostRepository,
    LinkCommentRepository,
    LinkViewRepository,
    LinkMetadataRepository,
    CachedImageRepository,
    ReaderAnnotationRepository,
    ReaderContentCacheRepository,
    LinkAccessHelper,
    GridFsService,
    AuditService,
  ],
  controllers: [SocialController, ScraperController],
  exports: [
    SocialService,
    LinkService,
    CommentService,
    ReaderService,
    ScraperService,
  ],
})
export class SocialModule {}

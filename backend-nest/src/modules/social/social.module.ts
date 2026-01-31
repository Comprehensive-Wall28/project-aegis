import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialService } from './social.service';
import { LinkService } from './link.service';
import { CommentService } from './comment.service';
import { ImageProxyService } from './image-proxy.service';
import { SocialController } from './social.controller';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { SocialRepository } from './social.repository';
import { CollectionRepository } from './collection.repository';
import { LinkPostRepository } from './repositories/link-post.repository';
import { LinkCommentRepository } from './repositories/link-comment.repository';
import { LinkViewRepository } from './repositories/link-view.repository';
import { LinkMetadataRepository } from './repositories/link-metadata.repository';
import { CachedImageRepository } from './repositories/cached-image.repository';
import { LinkAccessHelper } from './utils/link-access.helper';
import { Room, RoomSchema } from './schemas/room.schema';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { LinkPost, LinkPostSchema } from './schemas/link-post.schema';
import { LinkComment, LinkCommentSchema } from './schemas/link-comment.schema';
import { LinkView, LinkViewSchema } from './schemas/link-view.schema';
import { LinkMetadata, LinkMetadataSchema } from './schemas/link-metadata.schema';
import { CachedImage, CachedImageSchema } from './schemas/cached-image.schema';
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
        ]),
        MongooseModule.forFeature(
            [
                { name: LinkView.name, schema: LinkViewSchema },
                { name: LinkMetadata.name, schema: LinkMetadataSchema },
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
        ScraperService,
        SocialRepository,
        CollectionRepository,
        LinkPostRepository,
        LinkCommentRepository,
        LinkViewRepository,
        LinkMetadataRepository,
        CachedImageRepository,
        LinkAccessHelper,
        GridFsService,
        AuditService,
    ],
    controllers: [
        SocialController,
        ScraperController,
    ],
    exports: [SocialService, LinkService, CommentService, ScraperService],
})
export class SocialModule { }

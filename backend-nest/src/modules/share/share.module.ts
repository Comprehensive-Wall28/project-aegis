import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { SharedFile, SharedFileSchema } from './schemas/shared-file.schema';
import { SharedLink, SharedLinkSchema } from './schemas/shared-link.schema';
import { SharedFileRepository } from './repositories/shared-file.repository';
import { SharedLinkRepository } from './repositories/shared-link.repository';
import { VaultModule } from '../vault/vault.module';
import { UsersModule } from '../users/users.module';
import { FoldersModule } from '../folders/folders.module';
import { PublicShareService } from './public-share.service';
import { PublicShareController } from './public-share.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SharedFile.name, schema: SharedFileSchema },
            { name: SharedLink.name, schema: SharedLinkSchema },
        ]),
        VaultModule,
        UsersModule,
        FoldersModule,
    ],
    controllers: [ShareController, PublicShareController],
    providers: [
        ShareService,
        PublicShareService,
        SharedFileRepository,
        SharedLinkRepository,
    ],
    exports: [ShareService],
})
export class ShareModule { }

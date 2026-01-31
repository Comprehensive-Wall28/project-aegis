import { Module, Global, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { GridFsService } from './gridfs.service';
import { GoogleDriveService } from './google-drive.service';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';
import { GoogleDriveController } from './google-drive.controller';
import { VaultFile, VaultFileSchema } from './schemas/vault-file.schema';
import { UsersModule } from '../users/users.module';
import { FoldersModule } from '../folders/folders.module';
import { VaultRepository } from './vault.repository';

@Global()
@Module({
    imports: [
        MongooseModule.forFeature([{ name: VaultFile.name, schema: VaultFileSchema }]),
        ConfigModule,
        UsersModule,
        forwardRef(() => FoldersModule)
    ],
    controllers: [VaultController, GoogleDriveController],
    providers: [GridFsService, GoogleDriveService, VaultService, VaultRepository],
    exports: [VaultService, GridFsService, VaultRepository],
})
export class VaultModule { }

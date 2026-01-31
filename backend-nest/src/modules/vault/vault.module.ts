import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { GridFsService } from './gridfs.service';
import { GoogleDriveService } from './google-drive.service';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';
import { VaultFile, VaultFileSchema } from './schemas/vault-file.schema';
import { UsersModule } from '../users/users.module';
import { FoldersModule } from '../folders/folders.module';

@Global()
@Module({
    imports: [
        MongooseModule.forFeature([{ name: VaultFile.name, schema: VaultFileSchema }]),
        ConfigModule,
        UsersModule,
        FoldersModule
    ],
    controllers: [VaultController],
    providers: [GridFsService, GoogleDriveService, VaultService],
    exports: [VaultService, GridFsService],
})
export class VaultModule { }

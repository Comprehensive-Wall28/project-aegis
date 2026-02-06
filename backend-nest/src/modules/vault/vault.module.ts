import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { VaultRepository } from './repositories/vault.repository';
import { GoogleDriveService } from './services/google-drive.service';
import { FileMetadata, FileMetadataSchema } from './schemas/file-metadata.schema';
import { FoldersModule } from '../folders/folders.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: FileMetadata.name, schema: FileMetadataSchema },
        ], 'primary'),
        AuditModule,
        AuthModule,
        forwardRef(() => FoldersModule),
    ],
    controllers: [VaultController],
    providers: [VaultService, VaultRepository, GoogleDriveService],
    exports: [VaultService, VaultRepository],
})
export class VaultModule { }

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { VaultModule } from '../vault/vault.module';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { SharedFolder, SharedFolderSchema } from './schemas/shared-folder.schema';
import { FolderRepository } from './folders.repository';

@Module({
    imports: [
        forwardRef(() => VaultModule),
        MongooseModule.forFeature([
            { name: Folder.name, schema: FolderSchema },
            { name: SharedFolder.name, schema: SharedFolderSchema }
        ]),
    ],
    controllers: [FoldersController],
    providers: [FoldersService, FolderRepository],
    exports: [FoldersService],
})
export class FoldersModule { }

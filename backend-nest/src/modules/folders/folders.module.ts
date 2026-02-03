import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Folder, FolderSchema } from './folder.schema';
import { FolderRepository } from './folder.repository';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
        AuthModule
    ],
    controllers: [FolderController],
    providers: [FolderRepository, FolderService],
    exports: [FolderService]
})
export class FoldersModule { }

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { FolderRepository } from './folders.repository';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
    ],
    controllers: [FoldersController],
    providers: [FoldersService, FolderRepository],
    exports: [FoldersService],
})
export class FoldersModule { }

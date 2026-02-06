import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { FolderRepository } from './repositories/folder.repository';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Folder.name, schema: FolderSchema },
        ], 'primary'),
        AuthModule,
    ],
    controllers: [FoldersController],
    providers: [FoldersService, FolderRepository],
    exports: [FoldersService, FolderRepository, MongooseModule],
})
export class FoldersModule { }

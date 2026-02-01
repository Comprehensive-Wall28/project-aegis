import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotesService } from './notes.service';
import { NoteFolderService } from './note-folders.service';
import { NotesController } from './notes.controller';
import { Note, NoteSchema } from './schemas/note.schema';
import { NoteFolder, NoteFolderSchema } from './schemas/note-folder.schema';
import { NoteRepository } from './repositories/note.repository';
import { NoteFolderRepository } from './repositories/note-folder.repository';
import { VaultModule } from '../vault/vault.module';
import { AuditService } from '../../common/services/audit.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Note.name, schema: NoteSchema },
            { name: NoteFolder.name, schema: NoteFolderSchema }
        ]),
        VaultModule
    ],
    controllers: [NotesController],
    providers: [
        NotesService,
        NoteFolderService,
        NoteRepository,
        NoteRepository,
        NoteFolderRepository,
        AuditService
    ],
    exports: [NotesService, NoteFolderService],
})
export class NotesModule { }

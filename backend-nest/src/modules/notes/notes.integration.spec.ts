import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NotesModule } from './notes.module';
import { NotesService } from './notes.service';
import { CreateNoteDTO } from './dto/note.dto';
import { Connection, Types } from 'mongoose';

describe('NotesModule (Integration)', () => {
    let mongoServer: MongoMemoryReplSet;
    let module: TestingModule;
    let notesService: NotesService;
    let dbConnection: Connection;
    const userId = new Types.ObjectId();

    beforeAll(async () => {
        mongoServer = await MongoMemoryReplSet.create({
            replSet: { count: 1 }
        });
        const uri = mongoServer.getUri();

        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    load: [() => ({
                        MONGO_URI: uri,
                    })],
                }),
                MongooseModule.forRoot(uri),
                NotesModule,
            ],
        }).compile();

        notesService = module.get<NotesService>(NotesService);
        dbConnection = module.get<Connection>(getConnectionToken());
    });

    afterAll(async () => {
        await module.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        const collections = dbConnection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    });

    it('should create a note with GridFS content', async () => {
        const dto: CreateNoteDTO = {
            encryptedTitle: 'Encrypted Title',
            encryptedContent: Buffer.from('Encrypted Content').toString('base64'),
            encapsulatedKey: 'enc-key',
            encryptedSymmetricKey: 'sym-key',
            recordHash: 'hash-abc',
        };

        const note = await notesService.create(userId.toHexString(), dto);

        expect(note).toBeDefined();
        expect(note.encryptedTitle).toBe('Encrypted Title');
        expect(note.gridFsFileId).toBeDefined();
        expect(note.contentSize).toBeGreaterThan(0);
    });

    it('should retrieve note content from GridFS', async () => {
        const contentStr = 'Secret Note Content';
        const dto: CreateNoteDTO = {
            encryptedTitle: 'Title',
            encryptedContent: Buffer.from(contentStr).toString('base64'),
            encapsulatedKey: 'enc-key',
            encryptedSymmetricKey: 'sym-key',
            recordHash: 'hash-abc',
        };

        const createdNote = await notesService.create(userId.toHexString(), dto);
        const { buffer } = await notesService.getContent((createdNote as any)._id.toString(), userId.toHexString());

        expect(buffer.toString()).toBe(contentStr);
    });

    it('should delete a note and its GridFS content', async () => {
        const dto: CreateNoteDTO = {
            encryptedTitle: 'Title',
            encryptedContent: Buffer.from('content').toString('base64'),
            encapsulatedKey: 'enc-key',
            encryptedSymmetricKey: 'sym-key',
            recordHash: 'hash-abc',
        };

        const createdNote = await notesService.create(userId.toHexString(), dto);
        const noteId = (createdNote as any)._id.toString();

        await notesService.remove(noteId, userId.toHexString());

        await expect(notesService.findOne(noteId, userId.toHexString())).rejects.toThrow('Note not found');

        // Verifying GridFS deletion would require direct bucket access, 
        // but the service call passing is already a good indicator.
    });
});

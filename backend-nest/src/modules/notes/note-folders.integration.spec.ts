import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NotesModule } from './notes.module';
import { NoteFolderService } from './note-folders.service';
import { CreateFolderDTO } from './dto/note.dto';
import { Connection, Types } from 'mongoose';

describe('NoteFolderService (Integration)', () => {
    let mongoServer: MongoMemoryReplSet;
    let module: TestingModule;
    let folderService: NoteFolderService;
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

        folderService = module.get<NoteFolderService>(NoteFolderService);
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

    it('should create a folder at root', async () => {
        const dto: CreateFolderDTO = {
            name: 'Root Folder',
            color: '#FF0000',
        };

        const folder = await folderService.create(userId.toHexString(), dto);
        expect(folder.name).toBe('Root Folder');
        expect(folder.parentId).toBeNull();
    });

    it('should create a nested folder', async () => {
        const rootDto: CreateFolderDTO = { name: 'Root' };
        const root = await folderService.create(userId.toHexString(), rootDto);

        const nestedDto: CreateFolderDTO = {
            name: 'Nested',
            parentId: (root as any)._id.toString(),
        };

        const nested = await folderService.create(userId.toHexString(), nestedDto);
        expect(nested.name).toBe('Nested');
        expect(nested.parentId?.toString()).toBe((root as any)._id.toString());
    });

    it('should not allow duplicate names in the same parent', async () => {
        const dto: CreateFolderDTO = { name: 'Duplicate' };
        await folderService.create(userId.toHexString(), dto);

        await expect(folderService.create(userId.toHexString(), dto))
            .rejects.toThrow('A folder with this name already exists');
    });

    it('should find all folders for a user', async () => {
        await folderService.create(userId.toHexString(), { name: 'F1' });
        await folderService.create(userId.toHexString(), { name: 'F2' });

        const folders = await folderService.findAll(userId.toHexString());
        expect(folders).toHaveLength(2);
    });

    it('should remove a folder and its descendants', async () => {
        const root = await folderService.create(userId.toHexString(), { name: 'Root' });
        const rootId = (root as any)._id.toString();

        const nested = await folderService.create(userId.toHexString(), {
            name: 'Nested',
            parentId: rootId
        });
        const nestedId = (nested as any)._id.toString();

        await folderService.remove(rootId, userId.toHexString());

        await expect(folderService.findOne(rootId, userId.toHexString())).rejects.toThrow('Folder not found');
        await expect(folderService.findOne(nestedId, userId.toHexString())).rejects.toThrow('Folder not found');
    });
});

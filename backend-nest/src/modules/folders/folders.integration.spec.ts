import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { FoldersService } from './folders.service';
import { FolderRepository } from './folders.repository';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { Connection, Types } from 'mongoose';
import { VaultService } from '../vault/vault.service';

describe('FoldersModule (Integration)', () => {
    let mongoServer: MongoMemoryReplSet;
    let module: TestingModule;
    let foldersService: FoldersService;
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
                // Manually import the Feature for proper Model injection
                MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
            ],
            providers: [
                FoldersService,
                FolderRepository,
                {
                    provide: VaultService,
                    useValue: {
                        countFiles: jest.fn().mockResolvedValue(0)
                    }
                }
            ]
        })
            .compile();

        foldersService = module.get<FoldersService>(FoldersService);
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

    it('should create a root folder', async () => {
        const folder = await foldersService.createFolder(userId.toHexString(), {
            name: 'Root Folder',
            color: '#FF0000',
            encryptedSessionKey: 'mock-session-key',
        } as any);

        expect(folder).toBeDefined();
        expect(folder.name).toBe('Root Folder');
        expect(folder.parentId).toBeNull();
        expect(folder.ownerId.toString()).toBe(userId.toHexString());
        expect(folder.encryptedSessionKey).toBe('mock-session-key');
    });

    it('should create a subfolder', async () => {
        const root = await foldersService.createFolder(userId.toHexString(), {
            name: 'Root',
            color: '#00FF00',
            encryptedSessionKey: 'mock-key',
        } as any);

        const sub = await foldersService.createFolder(userId.toHexString(), {
            name: 'Sub',
            parentId: (root as any)._id.toString(),
            encryptedSessionKey: 'mock-key-2',
        } as any);

        expect(sub.parentId.toString()).toBe((root as any)._id.toString());
    });

    it('should get folder hierarchy', async () => {
        const root = await foldersService.createFolder(userId.toHexString(), { name: 'Level 1', encryptedSessionKey: 'key' } as any);
        const level2 = await foldersService.createFolder(userId.toHexString(), {
            name: 'Level 2',
            parentId: (root as any)._id.toString(),
            encryptedSessionKey: 'key'
        } as any);
        const level3 = await foldersService.createFolder(userId.toHexString(), {
            name: 'Level 3',
            parentId: (level2 as any)._id.toString(),
            encryptedSessionKey: 'key'
        } as any);

        const fetched = await foldersService.getFolder(userId.toHexString(), (level3 as any)._id.toString());

        expect(fetched.path).toHaveLength(2);
        expect(fetched.path[0].name).toBe('Level 1');
        expect(fetched.path[1].name).toBe('Level 2');
    });

    it('should delete a folder if empty', async () => {
        const folder = await foldersService.createFolder(userId.toHexString(), { name: 'To Delete', encryptedSessionKey: 'key' } as any);
        const id = (folder as any)._id.toString();

        await foldersService.deleteFolder(userId.toHexString(), id);

        await expect(foldersService.findById(id)).rejects.toThrow();
    });

    it('should prevent deletion of folder with subfolders', async () => {
        const root = await foldersService.createFolder(userId.toHexString(), { name: 'Root', encryptedSessionKey: 'key' } as any);
        await foldersService.createFolder(userId.toHexString(), {
            name: 'Sub',
            parentId: (root as any)._id.toString(),
            encryptedSessionKey: 'key'
        } as any);

        await expect(foldersService.deleteFolder(userId.toHexString(), (root as any)._id.toString()))
            .rejects.toThrow('Cannot delete folder with subfolders');
    });
});

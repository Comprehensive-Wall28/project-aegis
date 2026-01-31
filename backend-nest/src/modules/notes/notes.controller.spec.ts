import { Test, TestingModule } from '@nestjs/testing';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NoteFolderService } from './note-folders.service';
import { CreateNoteDTO, CreateFolderDTO, UpdateNoteContentDTO, UpdateNoteMetadataDTO } from './dto/note.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { FastifyReply } from 'fastify';

describe('NotesController', () => {
    let controller: NotesController;
    let notesService: NotesService;
    let foldersService: NoteFolderService;

    const mockNotesService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        getContent: jest.fn(),
        updateMetadata: jest.fn(),
        updateContent: jest.fn(),
        remove: jest.fn(),
    };

    const mockFoldersService = {
        create: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    };

    const mockRequest = {
        user: { userId: 'user_id' },
    };

    const mockResponse = {
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotesController],
            providers: [
                {
                    provide: NotesService,
                    useValue: mockNotesService,
                },
                {
                    provide: NoteFolderService,
                    useValue: mockFoldersService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<NotesController>(NotesController);
        notesService = module.get<NotesService>(NotesService);
        foldersService = module.get<NoteFolderService>(NoteFolderService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('Folder Routes', () => {
        it('should create a folder', async () => {
            const dto: CreateFolderDTO = { name: 'Folder' };
            mockFoldersService.create.mockResolvedValue({});
            await controller.createFolder(mockRequest, dto);
            expect(foldersService.create).toHaveBeenCalledWith('user_id', dto);
        });

        it('should get all folders', async () => {
            mockFoldersService.findAll.mockResolvedValue([]);
            await controller.getFolders(mockRequest);
            expect(foldersService.findAll).toHaveBeenCalledWith('user_id');
        });

        it('should update a folder', async () => {
            const dto = { name: 'Updated' };
            await controller.updateFolder(mockRequest, 'id', dto);
            expect(foldersService.update).toHaveBeenCalledWith('id', 'user_id', dto);
        });

        it('should delete a folder', async () => {
            await controller.deleteFolder(mockRequest, 'id');
            expect(foldersService.remove).toHaveBeenCalledWith('id', 'user_id');
        });
    });

    describe('Note Routes', () => {
        it('should create a note', async () => {
            const dto: CreateNoteDTO = {
                encryptedTitle: 'Note',
                encryptedContent: 'test',
                noteFolderId: 'fid',
                encapsulatedKey: 'key',
                encryptedSymmetricKey: 'sym_key',
                recordHash: 'hash',
            };
            mockNotesService.create.mockResolvedValue({});
            await controller.createNote(mockRequest, dto);
            expect(notesService.create).toHaveBeenCalledWith('user_id', dto);
        });

        it('should get all notes', async () => {
            mockNotesService.findAll.mockResolvedValue([]);
            await controller.getNotes(mockRequest);
            expect(notesService.findAll).toHaveBeenCalledWith('user_id');
        });

        it('should get a single note', async () => {
            mockNotesService.findOne.mockResolvedValue({});
            await controller.getNote(mockRequest, 'id');
            expect(notesService.findOne).toHaveBeenCalledWith('id', 'user_id');
        });

        it('should get note content', async () => {
            const buffer = Buffer.from('test content');
            mockNotesService.getContent.mockResolvedValue({ buffer });
            await controller.getNoteContent(mockRequest, 'id', mockResponse);
            expect(notesService.getContent).toHaveBeenCalledWith('id', 'user_id');
            expect(mockResponse.header).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
            expect(mockResponse.send).toHaveBeenCalledWith(buffer);
        });

        it('should update note metadata', async () => {
            const dto: UpdateNoteMetadataDTO = { encryptedTitle: 'Updated' };
            await controller.updateNoteMetadata(mockRequest, 'id', dto);
            expect(notesService.updateMetadata).toHaveBeenCalledWith('id', 'user_id', dto);
        });

        it('should update note content', async () => {
            const dto: UpdateNoteContentDTO = {
                encryptedContent: 'updated content',
                encapsulatedKey: 'key',
                encryptedSymmetricKey: 'sym_key',
                recordHash: 'hash',
            };
            await controller.updateNoteContent(mockRequest, 'id', dto);
            expect(notesService.updateContent).toHaveBeenCalledWith('id', 'user_id', dto);
        });

        it('should delete a note', async () => {
            await controller.deleteNote(mockRequest, 'id');
            expect(notesService.remove).toHaveBeenCalledWith('id', 'user_id');
        });
    });
});

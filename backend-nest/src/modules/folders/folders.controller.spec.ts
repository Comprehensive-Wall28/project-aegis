import { Test, TestingModule } from '@nestjs/testing';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('FoldersController', () => {
  let controller: FoldersController;
  let service: FoldersService;

  const mockFoldersService = {
    getFolders: jest.fn(),
    getFolder: jest.fn(),
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
  };

  const mockRequest = {
    user: { userId: 'user_id' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoldersController],
      providers: [
        {
          provide: FoldersService,
          useValue: mockFoldersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FoldersController>(FoldersController);
    service = module.get<FoldersService>(FoldersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFolders', () => {
    it('should call getFolders with correct parameters', async () => {
      const parentId = 'parent_id';
      mockFoldersService.getFolders.mockResolvedValue([]);

      await controller.getFolders(mockRequest, parentId);

      expect(service.getFolders).toHaveBeenCalledWith('user_id', parentId);
    });
  });

  describe('getFolder', () => {
    it('should call getFolder with correct parameters', async () => {
      const id = 'folder_id';
      mockFoldersService.getFolder.mockResolvedValue({});

      await controller.getFolder(mockRequest, id);

      expect(service.getFolder).toHaveBeenCalledWith('user_id', id);
    });
  });

  describe('create', () => {
    it('should call createFolder with correct parameters', async () => {
      const dto: CreateFolderDto = {
        name: 'New Folder',
        encryptedSessionKey: 'key',
      };
      mockFoldersService.createFolder.mockResolvedValue({});

      await controller.create(mockRequest, dto);

      expect(service.createFolder).toHaveBeenCalledWith('user_id', dto);
    });
  });

  describe('update', () => {
    it('should call updateFolder with correct parameters', async () => {
      const id = 'folder_id';
      const dto: UpdateFolderDto = { name: 'Updated Folder' };
      mockFoldersService.updateFolder.mockResolvedValue({});

      await controller.update(mockRequest, id, dto);

      expect(service.updateFolder).toHaveBeenCalledWith('user_id', id, dto);
    });
  });

  describe('remove', () => {
    it('should call deleteFolder with correct parameters', async () => {
      const id = 'folder_id';
      mockFoldersService.deleteFolder.mockResolvedValue({});

      await controller.remove(mockRequest, id);

      expect(service.deleteFolder).toHaveBeenCalledWith('user_id', id);
    });
  });
});

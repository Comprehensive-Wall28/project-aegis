import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FolderRepository } from './folders.repository';
import { Folder } from './schemas/folder.schema';

describe('FolderRepository', () => {
  let repository: FolderRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FolderRepository,
        { provide: getModelToken(Folder.name), useValue: {} },
      ],
    }).compile();

    repository = module.get<FolderRepository>(FolderRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});

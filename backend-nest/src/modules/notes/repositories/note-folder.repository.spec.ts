import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NoteFolderRepository } from './note-folder.repository';
import { NoteFolder } from '../schemas/note-folder.schema';

describe('NoteFolderRepository', () => {
  let repository: NoteFolderRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteFolderRepository,
        { provide: getModelToken(NoteFolder.name), useValue: {} },
      ],
    }).compile();

    repository = module.get<NoteFolderRepository>(NoteFolderRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});

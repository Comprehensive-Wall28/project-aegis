import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GpaRepository } from './gpa.repository';
import { Course } from './schemas/course.schema';

describe('GpaRepository', () => {
    let repository: GpaRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GpaRepository,
                { provide: getModelToken(Course.name), useValue: {} },
            ],
        }).compile();

        repository = module.get<GpaRepository>(GpaRepository);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
});

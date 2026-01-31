import { Test, TestingModule } from '@nestjs/testing';
import { GpaService } from './gpa.service';
import { GpaRepository } from './gpa.repository';
import { UsersService } from '../users/users.service';
import { Types } from 'mongoose';

const mockGpaRepository = () => ({
    findMany: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
});

const mockUsersService = () => ({
    findById: jest.fn(),
    updateProfile: jest.fn(),
});

describe('GpaService', () => {
    let service: GpaService;
    let repository: any;
    let usersService: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GpaService,
                { provide: GpaRepository, useFactory: mockGpaRepository },
                { provide: UsersService, useFactory: mockUsersService },
            ],
        }).compile();

        service = module.get<GpaService>(GpaService);
        repository = module.get<GpaRepository>(GpaRepository);
        usersService = module.get<UsersService>(UsersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getCourses', () => {
        it('should return courses', async () => {
            const userId = new Types.ObjectId().toString();
            const expected: any[] = [];
            repository.findMany.mockResolvedValue(expected);
            const result = await service.getCourses(userId);
            expect(result).toEqual(expected);
        });
    });
});

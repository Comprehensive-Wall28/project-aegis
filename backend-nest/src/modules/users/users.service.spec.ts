
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User } from './schemas/user.schema';

const mockUser = {
    _id: 'userid',
    username: 'testuser',
    email: 'test@example.com',
    pqcPublicKey: 'key',
    passwordHash: 'hash',
};

describe('UsersService', () => {
    let service: UsersService;
    let repository: UsersRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: UsersRepository,
                    useValue: {
                        create: jest.fn().mockResolvedValue(mockUser),
                        findById: jest.fn().mockResolvedValue(mockUser),
                        findByEmail: jest.fn().mockResolvedValue(mockUser),
                        findByUsername: jest.fn().mockResolvedValue(mockUser),
                        updateById: jest.fn().mockResolvedValue(mockUser),
                        isUsernameTaken: jest.fn().mockResolvedValue(false),
                        isEmailTaken: jest.fn().mockResolvedValue(false),
                    },
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        repository = module.get<UsersRepository>(UsersRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a user', async () => {
            const result = await service.create(mockUser as any);
            expect(result).toEqual(mockUser);
            expect(repository.create).toHaveBeenCalled();
        });
    });

    describe('findById', () => {
        it('should find a user by id', async () => {
            const result = await service.findById('userid');
            expect(result).toEqual(mockUser);
        });
    });
});

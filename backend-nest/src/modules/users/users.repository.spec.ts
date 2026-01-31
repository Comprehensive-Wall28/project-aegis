import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersRepository } from './users.repository';
import { User } from './schemas/user.schema';
import { Model, Types } from 'mongoose';

describe('UsersRepository', () => {
    let repository: UsersRepository;
    let model: Model<any>;

    const mockUserModel = {
        findOne: jest.fn(),
        exists: jest.fn(),
        findOneAndUpdate: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        create: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersRepository,
                {
                    provide: getModelToken(User.name),
                    useValue: mockUserModel,
                },
            ],
        }).compile();

        repository = module.get<UsersRepository>(UsersRepository);
        model = module.get<Model<any>>(getModelToken(User.name));
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('findByEmail', () => {
        it('should call findOne with lowercased email', async () => {
            const email = ' TEST@ex.com ';
            mockUserModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            await repository.findByEmail(email);
            // findOne in BaseRepository only passes the sanitized filter
            expect(mockUserModel.findOne).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'test@ex.com' })
            );
        });
    });

    describe('isUsernameTaken', () => {
        it('should return true if user exists', async () => {
            mockUserModel.exists.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ _id: 'id' }),
            });
            const result = await repository.isUsernameTaken('user');
            expect(result).toBe(true);
        });

        it('should exclude user id if provided', async () => {
            const validId = new Types.ObjectId().toString();
            mockUserModel.exists.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });
            await repository.isUsernameTaken('user', validId);
            expect(mockUserModel.exists).toHaveBeenCalledWith(
                expect.objectContaining({
                    username: 'user',
                    _id: { $ne: new Types.ObjectId(validId) }
                })
            );
        });
    });

    describe('updatePasswordHash', () => {
        it('should call updateById with $set', async () => {
            const validId = new Types.ObjectId().toString();
            mockUserModel.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue({}),
            });
            await repository.updatePasswordHash(validId, 'hash');
            expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
                validId,
                expect.objectContaining({ $set: { passwordHash: 'hash' } }),
                expect.any(Object)
            );
        });
    });
});

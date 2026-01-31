import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TaskRepository } from './task.repository';
import { Task } from '../schemas/task.schema';
import { Model, Types } from 'mongoose';

describe('TaskRepository', () => {
    let repository: TaskRepository;
    let model: Model<any>;
    const userId = new Types.ObjectId().toString();

    const mockTaskModel = {
        find: jest.fn(),
        findOne: jest.fn(),
        updateOne: jest.fn(),
        db: {
            startSession: jest.fn().mockResolvedValue({
                startTransaction: jest.fn(),
                commitTransaction: jest.fn(),
                abortTransaction: jest.fn(),
                endSession: jest.fn(),
            }),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TaskRepository,
                { provide: getModelToken(Task.name), useValue: mockTaskModel },
            ],
        }).compile();

        repository = module.get<TaskRepository>(TaskRepository);
        model = module.get<Model<any>>(getModelToken(Task.name));
        jest.clearAllMocks();
    });

    describe('findByUserId', () => {
        it('should call find with userId and sort', async () => {
            mockTaskModel.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });
            await repository.findByUserId(userId);
            expect(mockTaskModel.find).toHaveBeenCalledWith(expect.objectContaining({
                userId: new Types.ObjectId(userId)
            }));
        });
    });

    describe('getMaxOrderInColumn', () => {
        it('should return 0 if no tasks found', async () => {
            mockTaskModel.findOne.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            });
            const result = await repository.getMaxOrderInColumn(userId, 's');
            expect(result).toBe(0);
        });

        it('should return task order if found', async () => {
            mockTaskModel.findOne.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue({ order: 5 }),
            });
            const result = await repository.getMaxOrderInColumn(userId, 's');
            expect(result).toBe(5);
        });
    });

    describe('findUpcoming', () => {
        it('should call find with filters and sort', async () => {
            mockTaskModel.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            });
            await repository.findUpcoming(userId, 5);
            expect(mockTaskModel.find).toHaveBeenCalledWith(expect.objectContaining({
                userId: new Types.ObjectId(userId),
                status: { $ne: 'done' },
            }));
        });
    });
});

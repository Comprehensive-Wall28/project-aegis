import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { TaskRepository } from './repositories/task.repository';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('TasksService', () => {
    let service: TasksService;
    let repository: TaskRepository;

    const mockTaskRepository = {
        findOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        getMaxOrderInColumn: jest.fn(),
        create: jest.fn(),
        findByUserId: jest.fn(),
        reorderBulk: jest.fn(),
        findUpcoming: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                { provide: TaskRepository, useValue: mockTaskRepository },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);
        repository = module.get<TaskRepository>(TaskRepository);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findOne', () => {
        it('should return a task if found', async () => {
            const mockTask = { _id: 'id', userId: 'uid' };
            mockTaskRepository.findOne.mockResolvedValue(mockTask);
            const result = await service.findOne('id', 'uid');
            expect(result).toBe(mockTask);
        });

        it('should throw NotFoundException if not found', async () => {
            mockTaskRepository.findOne.mockResolvedValue(null);
            await expect(service.findOne('id', 'uid')).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create a task with calculated order', async () => {
            const userId = new Types.ObjectId().toString();
            const dto = {
                encryptedData: 'data',
                encapsulatedKey: 'key',
                encryptedSymmetricKey: 'sym',
                recordHash: 'hash',
                status: 'todo',
            };
            mockTaskRepository.getMaxOrderInColumn.mockResolvedValue(5);
            mockTaskRepository.create.mockResolvedValue({ ...dto, order: 6 });

            const result = await service.create(userId, dto as any);

            expect(mockTaskRepository.getMaxOrderInColumn).toHaveBeenCalledWith(userId, 'todo');
            expect(mockTaskRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                order: 6,
            }));
            expect(result).toBeDefined();
        });
    });

    describe('update', () => {
        it('should update a task', async () => {
            const mockTask = { _id: 'id', title: 'updated' };
            mockTaskRepository.updateOne.mockResolvedValue(mockTask);
            const result = await service.update('id', 'uid', { status: 'done' });
            expect(result).toBe(mockTask);
        });

        it('should throw NotFoundException if update fails', async () => {
            mockTaskRepository.updateOne.mockResolvedValue(null);
            await expect(service.update('id', 'uid', {})).rejects.toThrow(NotFoundException);
        });
    });

    describe('reorder', () => {
        it('should call repository.reorderBulk', async () => {
            const updates = [{ id: '1', order: 1 }];
            await service.reorder('uid', updates);
            expect(mockTaskRepository.reorderBulk).toHaveBeenCalledWith('uid', updates);
        });
    });

    describe('findUpcoming', () => {
        it('should call repository.findUpcoming', async () => {
            await service.findUpcoming('uid', 5);
            expect(mockTaskRepository.findUpcoming).toHaveBeenCalledWith('uid', 5);
        });
    });
});

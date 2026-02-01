import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CreateTaskDTO, UpdateTaskDTO } from './dto/task.dto';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findUpcoming: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
  };

  const mockRequest = { user: { userId: 'user_id' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call tasksService.create', async () => {
      const dto: CreateTaskDTO = {
        encryptedData: 'data',
        encapsulatedKey: 'key',
        encryptedSymmetricKey: 'sym_key',
        recordHash: 'hash',
      };
      await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith('user_id', dto);
    });
  });

  describe('findAll', () => {
    it('should call tasksService.findAll', async () => {
      await controller.findAll(mockRequest, 'todo', 'high');
      expect(service.findAll).toHaveBeenCalledWith('user_id', {
        status: 'todo',
        priority: 'high',
      });
    });
  });

  describe('getUpcoming', () => {
    it('should call tasksService.findUpcoming', async () => {
      await controller.getUpcoming(mockRequest, '5');
      expect(service.findUpcoming).toHaveBeenCalledWith('user_id', 5);
    });

    it('should use default limit if not provided', async () => {
      await controller.getUpcoming(mockRequest);
      expect(service.findUpcoming).toHaveBeenCalledWith('user_id', 10);
    });
  });

  describe('findOne', () => {
    it('should call tasksService.findOne', async () => {
      await controller.findOne(mockRequest, 'id');
      expect(service.findOne).toHaveBeenCalledWith('id', 'user_id');
    });
  });

  describe('update', () => {
    it('should call tasksService.update', async () => {
      const dto: UpdateTaskDTO = { status: 'done' };
      await controller.update(mockRequest, 'id', dto);
      expect(service.update).toHaveBeenCalledWith('id', 'user_id', dto);
    });
  });

  describe('remove', () => {
    it('should call tasksService.remove', async () => {
      await controller.remove(mockRequest, 'id');
      expect(service.remove).toHaveBeenCalledWith('id', 'user_id');
    });
  });

  describe('reorder', () => {
    it('should call tasksService.reorder', async () => {
      const updates = [{ id: '1', order: 1 }];
      await controller.reorder(mockRequest, { updates });
      expect(service.reorder).toHaveBeenCalledWith('user_id', updates);
    });
  });
});

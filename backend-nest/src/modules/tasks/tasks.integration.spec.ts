import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { TasksModule } from './tasks.module';
import { TasksService } from './tasks.service';
import { CreateTaskDTO } from './dto/task.dto';
import { Connection, Types } from 'mongoose';

describe('TasksModule (Integration)', () => {
  let mongoServer: MongoMemoryReplSet;
  let module: TestingModule;
  let tasksService: TasksService;
  let dbConnection: Connection;
  const userId = new Types.ObjectId();

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
    const uri = mongoServer.getUri();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              MONGO_URI: uri,
            }),
          ],
        }),
        MongooseModule.forRoot(uri),
        TasksModule,
      ],
    }).compile();

    tasksService = module.get<TasksService>(TasksService);
    dbConnection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await module.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = dbConnection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('should create a task and auto-calculate order', async () => {
    const dto: any = {
      encryptedData: 'abc',
      encapsulatedKey: 'abc',
      encryptedSymmetricKey: 'abc',
      recordHash: 'abc',
      status: 'todo',
    };

    const task1 = await tasksService.create(userId.toHexString(), dto);
    expect(task1.order).toBe(1);

    const task2 = await tasksService.create(userId.toHexString(), dto);
    expect(task2.order).toBe(2);
  });

  it('should find all tasks for a user', async () => {
    const dto: any = {
      encryptedData: 'abc',
      encapsulatedKey: 'abc',
      encryptedSymmetricKey: 'abc',
      recordHash: 'abc',
    };
    await tasksService.create(userId.toHexString(), dto);
    await tasksService.create(userId.toHexString(), dto);

    const tasks = await tasksService.findAll(userId.toHexString());
    expect(tasks).toHaveLength(2);
  });

  it('should reorder tasks in bulk', async () => {
    const dto: any = {
      encryptedData: 'abc',
      encapsulatedKey: 'abc',
      encryptedSymmetricKey: 'abc',
      recordHash: 'abc',
      status: 'todo',
    };
    const t1 = await tasksService.create(userId.toHexString(), dto);
    const t2 = await tasksService.create(userId.toHexString(), dto);

    await tasksService.reorder(userId.toHexString(), [
      { id: (t1 as any)._id.toString(), order: 2 },
      { id: (t2 as any)._id.toString(), order: 1 },
    ]);

    const tasks = await tasksService.findAll(userId.toHexString());
    expect(tasks[0].order).toBe(1);
    expect(tasks[1].order).toBe(2);
  });

  it('should find upcoming tasks', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dto: any = {
      encryptedData: 'abc',
      encapsulatedKey: 'abc',
      encryptedSymmetricKey: 'abc',
      recordHash: 'abc',
    };

    await tasksService.create(userId.toHexString(), {
      ...dto,
      dueDate: tomorrow.toISOString(),
    });
    await tasksService.create(userId.toHexString(), dto); // No due date

    const upcoming = await tasksService.findUpcoming(userId.toHexString());
    expect(upcoming).toHaveLength(1);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { GpaModule } from './gpa.module';
import { GpaService } from './gpa.service';
import { UsersService } from '../users/users.service';
import { Connection, Types } from 'mongoose';

describe('GpaModule (Integration)', () => {
  let mongoServer: MongoMemoryReplSet;
  let module: TestingModule;
  let gpaService: GpaService;
  let dbConnection: Connection;
  const userId = new Types.ObjectId();

  // Mock UsersService
  const mockUsersService = {
    findById: jest.fn().mockResolvedValue({ gpaSystem: 'NORMAL' }),
    updateProfile: jest.fn().mockResolvedValue(true),
  };

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
        GpaModule,
      ],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .compile();

    gpaService = module.get<GpaService>(GpaService);
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
    jest.clearAllMocks();
  });

  it('should create a course with encrypted data', async () => {
    const course = await gpaService.createCourse(
      userId.toHexString(),
      {
        encryptedData: 'mock-enc-data',
        encapsulatedKey: 'mock-key',
        encryptedSymmetricKey: 'mock-sym-key',
        // optional plaintext
        name: 'CS101',
        grade: 4.0,
      } as any,
      {},
    );

    expect(course).toBeDefined();
    expect(course.encryptedData).toBe('mock-enc-data');
  });

  it('should list user courses', async () => {
    await gpaService.createCourse(
      userId.toHexString(),
      {
        encryptedData: 'c1',
        encapsulatedKey: 'k',
        encryptedSymmetricKey: 'sk',
      } as any,
      {},
    );
    await gpaService.createCourse(
      userId.toHexString(),
      {
        encryptedData: 'c2',
        encapsulatedKey: 'k',
        encryptedSymmetricKey: 'sk',
      } as any,
      {},
    );

    const courses = await gpaService.getCourses(userId.toHexString());
    expect(courses).toHaveLength(2);
  });

  it('should delete a course', async () => {
    const course = await gpaService.createCourse(
      userId.toHexString(),
      {
        encryptedData: 'del',
        encapsulatedKey: 'k',
        encryptedSymmetricKey: 'sk',
      } as any,
      {},
    );

    await gpaService.deleteCourse(
      userId.toHexString(),
      (course as any)._id.toString(),
      {},
    );

    const courses = await gpaService.getCourses(userId.toHexString());
    expect(courses).toHaveLength(0);
  });

  it('should get GPA preferences (mocked)', async () => {
    const prefs = await gpaService.getPreferences(userId.toHexString());
    expect(prefs.gpaSystem).toBe('NORMAL');
    expect(mockUsersService.findById).toHaveBeenCalledWith(
      userId.toHexString(),
    );
  });

  it('should update GPA preferences (mocked)', async () => {
    const result = await gpaService.updatePreferences(
      userId.toHexString(),
      'GERMAN',
      {},
    );
    expect(result.gpaSystem).toBe('GERMAN');
    expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
      userId.toHexString(),
      { gpaSystem: 'GERMAN' },
    );
  });
});

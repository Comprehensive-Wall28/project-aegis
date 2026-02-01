import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { CalendarModule } from './calendar.module';
import { CalendarService } from './calendar.service';
import { Connection, Types } from 'mongoose';

describe('CalendarModule (Integration)', () => {
  let mongoServer: MongoMemoryReplSet;
  let module: TestingModule;
  let calendarService: CalendarService;
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
        CalendarModule,
      ],
    }).compile();

    calendarService = module.get<CalendarService>(CalendarService);
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

  it('should create an event', async () => {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 3600000);

    const event = await calendarService.createEvent(
      userId.toHexString(),
      {
        encryptedData: 'mock-enc-data',
        encapsulatedKey: 'mock-enc-key',
        encryptedSymmetricKey: 'mock-sym-key',
        startDate: now.toISOString(),
        endDate: nextHour.toISOString(),
        allDay: false,
      } as any,
      {},
    ); // Mock req

    expect(event).toBeDefined();
    expect(event.encryptedData).toBe('mock-enc-data');
    expect(event.userId.toString()).toBe(userId.toHexString());
  });

  it('should filter events by date range', async () => {
    const baseDate = new Date('2025-01-01T10:00:00Z');

    // Event 1: Inside range
    await calendarService.createEvent(
      userId.toHexString(),
      {
        encryptedData: 'ev1',
        encapsulatedKey: 'k',
        encryptedSymmetricKey: 'sk',
        startDate: baseDate.toISOString(),
        endDate: new Date(baseDate.getTime() + 3600000).toISOString(),
      } as any,
      {},
    );

    // Event 2: Outside range (next month)
    const nextMonth = new Date('2025-02-01T10:00:00Z');
    await calendarService.createEvent(
      userId.toHexString(),
      {
        encryptedData: 'ev2',
        encapsulatedKey: 'k',
        encryptedSymmetricKey: 'sk',
        startDate: nextMonth.toISOString(),
        endDate: new Date(nextMonth.getTime() + 3600000).toISOString(),
      } as any,
      {},
    );

    // Query Jan 2025
    const events = await calendarService.getEvents(
      userId.toHexString(),
      '2025-01-01T00:00:00Z',
      '2025-01-31T23:59:59Z',
    );

    expect(events).toHaveLength(1);
    expect(events[0].encryptedData).toBe('ev1');
  });

  it('should update an event', async () => {
    const event = await calendarService.createEvent(
      userId.toHexString(),
      {
        encryptedData: 'orig',
        encapsulatedKey: 'k',
        encryptedSymmetricKey: 'sk',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      } as any,
      {},
    );

    const updated = await calendarService.updateEvent(
      userId.toHexString(),
      (event as any)._id.toString(),
      { encryptedData: 'updated' } as any,
      {},
    );

    expect(updated.encryptedData).toBe('updated');
  });

  it('should delete an event', async () => {
    const event = await calendarService.createEvent(
      userId.toHexString(),
      {
        encryptedData: 'del',
        encapsulatedKey: 'k',
        encryptedSymmetricKey: 'sk',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      } as any,
      {},
    );

    const id = (event as any)._id.toString();
    await calendarService.deleteEvent(userId.toHexString(), id, {});

    const events = await calendarService.getEvents(userId.toHexString());
    expect(
      events.find((e) => (e as any)._id.toString() === id),
    ).toBeUndefined();
  });
});

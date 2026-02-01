import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CalendarRepository } from './calendar.repository';
import { CalendarEvent } from './schemas/calendar-event.schema';

describe('CalendarRepository', () => {
  let repository: CalendarRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarRepository,
        { provide: getModelToken(CalendarEvent.name), useValue: {} },
      ],
    }).compile();

    repository = module.get<CalendarRepository>(CalendarRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});

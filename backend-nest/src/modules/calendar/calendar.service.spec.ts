import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { CalendarRepository } from './calendar.repository';
import { Types } from 'mongoose';

const mockCalendarRepository = () => ({
    findMany: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
});

describe('CalendarService', () => {
    let service: CalendarService;
    let repository: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarService,
                { provide: CalendarRepository, useFactory: mockCalendarRepository },
            ],
        }).compile();

        service = module.get<CalendarService>(CalendarService);
        repository = module.get<CalendarRepository>(CalendarRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getEvents', () => {
        it('should return events', async () => {
            const userId = new Types.ObjectId().toString();
            const expected: any[] = [];
            repository.findMany.mockResolvedValue(expected);

            const result = await service.getEvents(userId);
            expect(result).toEqual(expected);
            expect(repository.findMany).toHaveBeenCalled();
        });
    });
});

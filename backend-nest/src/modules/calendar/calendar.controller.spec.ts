import { Test, TestingModule } from '@nestjs/testing';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('CalendarController', () => {
    let controller: CalendarController;
    let service: CalendarService;

    const mockCalendarService = {
        getEvents: jest.fn(),
        createEvent: jest.fn(),
        updateEvent: jest.fn(),
        deleteEvent: jest.fn(),
    };

    const mockRequest = {
        user: { userId: 'user_id' },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CalendarController],
            providers: [
                {
                    provide: CalendarService,
                    useValue: mockCalendarService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<CalendarController>(CalendarController);
        service = module.get<CalendarService>(CalendarService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('should call getEvents with correct parameters', async () => {
            const start = '2026-01-01';
            const end = '2026-01-31';
            mockCalendarService.getEvents.mockResolvedValue([]);

            await controller.findAll(mockRequest, start, end);

            expect(service.getEvents).toHaveBeenCalledWith('user_id', start, end);
        });
    });

    describe('create', () => {
        it('should call createEvent with correct parameters', async () => {
            const dto: CreateCalendarEventDto = {
                encryptedData: 'enc_data',
                encapsulatedKey: 'enc_key',
                encryptedSymmetricKey: 'sym_key',
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
            };
            mockCalendarService.createEvent.mockResolvedValue({});

            await controller.create(mockRequest, dto);

            expect(service.createEvent).toHaveBeenCalledWith('user_id', dto, mockRequest);
        });
    });

    describe('update', () => {
        it('should call updateEvent with correct parameters', async () => {
            const id = 'event_id';
            const dto: UpdateCalendarEventDto = { encryptedData: 'updated_data' };
            mockCalendarService.updateEvent.mockResolvedValue({});

            await controller.update(mockRequest, id, dto);

            expect(service.updateEvent).toHaveBeenCalledWith('user_id', id, dto, mockRequest);
        });
    });

    describe('remove', () => {
        it('should call deleteEvent with correct parameters', async () => {
            const id = 'event_id';
            mockCalendarService.deleteEvent.mockResolvedValue({});

            await controller.remove(mockRequest, id);

            expect(service.deleteEvent).toHaveBeenCalledWith('user_id', id, mockRequest);
        });
    });
});

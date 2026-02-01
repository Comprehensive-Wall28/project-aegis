import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { CalendarRepository } from './calendar.repository';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('CalendarService', () => {
  let service: CalendarService;
  let repository: CalendarRepository;

  const mockCalendarRepository = {
    findMany: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  };

  const mockReq = { ip: '127.0.0.1', headers: {} };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: CalendarRepository, useValue: mockCalendarRepository },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    repository = module.get<CalendarRepository>(CalendarRepository);

    // Mock logAction
    (service as any).logAction = jest.fn();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEvents', () => {
    const userId = new Types.ObjectId().toString();

    it('should fetch events for a user', async () => {
      mockCalendarRepository.findMany.mockResolvedValue([]);
      const result = await service.getEvents(userId);
      expect(result).toEqual([]);
      expect(mockCalendarRepository.findMany).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
      });
    });

    it('should apply start and end date filters', async () => {
      const start = '2023-01-01';
      const end = '2023-01-31';
      await service.getEvents(userId, start, end);
      expect(mockCalendarRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: {
            $gte: new Date(start),
            $lte: new Date(end),
          },
        }),
      );
    });
  });

  describe('createEvent', () => {
    it('should create an event and log action', async () => {
      const userId = new Types.ObjectId().toString();
      const dto = {
        startDate: '2023-01-01T10:00:00Z',
        endDate: '2023-01-01T11:00:00Z',
        encryptedData: 'data',
        encapsulatedKey: 'enc',
        encryptedSymmetricKey: 'sym',
      };
      const mockEvent = { _id: 'eid', ...dto };
      mockCalendarRepository.create.mockResolvedValue(mockEvent);

      const result = await service.createEvent(userId, dto as any, mockReq);

      expect(result).toEqual(mockEvent);
      expect((service as any).logAction).toHaveBeenCalled();
    });
  });

  describe('updateEvent', () => {
    const userId = 'u';
    const eventId = 'e';

    it('should throw NotFound if event does not exist for user', async () => {
      mockCalendarRepository.findOne.mockResolvedValue(null);
      await expect(
        service.updateEvent(userId, eventId, {}, mockReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update event and log action', async () => {
      const existing = { _id: eventId, userId };
      mockCalendarRepository.findOne.mockResolvedValue(existing);
      // Fix: return the updated data
      mockCalendarRepository.updateById.mockImplementation((id, data) =>
        Promise.resolve({ ...existing, ...data }),
      );

      const result = await service.updateEvent(
        userId,
        eventId,
        { encryptedData: 'new_data' } as any,
        mockReq,
      );

      expect(result.encryptedData).toBe('new_data');
      expect((service as any).logAction).toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    it('should throw NotFound if event not found', async () => {
      mockCalendarRepository.findOne.mockResolvedValue(null);
      await expect(service.deleteEvent('u', 'e', mockReq)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete and log action', async () => {
      mockCalendarRepository.findOne.mockResolvedValue({ _id: 'e' });
      await service.deleteEvent('u', 'e', mockReq);
      expect(mockCalendarRepository.deleteById).toHaveBeenCalledWith('e');
      expect((service as any).logAction).toHaveBeenCalled();
    });
  });
});

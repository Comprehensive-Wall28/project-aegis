import { Test, TestingModule } from '@nestjs/testing';
import { GpaService } from './gpa.service';
import { GpaRepository } from './gpa.repository';
import { UsersService } from '../users/users.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('GpaService', () => {
  let service: GpaService;
  let gpaRepository: GpaRepository;
  let usersService: UsersService;

  const mockGpaRepository = {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
  };

  const mockReq = { ip: '127.0.0.1', headers: {} };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpaService,
        { provide: GpaRepository, useValue: mockGpaRepository },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<GpaService>(GpaService);
    gpaRepository = module.get<GpaRepository>(GpaRepository);
    usersService = module.get<UsersService>(UsersService);

    // Mock logAction to avoid errors from BaseService
    (service as any).logAction = jest.fn();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCourses', () => {
    it('should return courses for a user', async () => {
      const userId = new Types.ObjectId().toString();
      mockGpaRepository.findMany.mockResolvedValue([]);
      const result = await service.getCourses(userId);
      expect(result).toEqual([]);
    });
  });

  describe('createCourse', () => {
    it('should create and log course creation', async () => {
      const userId = new Types.ObjectId().toString();
      const dto = { name: 'Math', grade: 1.0, credits: 5 };
      const mockCourse = { _id: 'cid', ...dto };
      mockGpaRepository.create.mockResolvedValue(mockCourse);

      const result = await service.createCourse(userId, dto as any, mockReq);

      expect(result).toBe(mockCourse);
      expect((service as any).logAction).toHaveBeenCalled();
    });
  });

  describe('deleteCourse', () => {
    it('should throw NotFound if course not found', async () => {
      mockGpaRepository.deleteOne.mockResolvedValue(false);
      await expect(service.deleteCourse('u', 'c', mockReq)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update gpaSystem', async () => {
      await service.updatePreferences('u', 'GERMAN', mockReq);
      expect(usersService.updateProfile).toHaveBeenCalledWith('u', {
        gpaSystem: 'GERMAN',
      });
    });

    it('should throw BadRequest if gpaSystem is invalid', async () => {
      await expect(
        service.updatePreferences('u', 'INVALID', mockReq),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

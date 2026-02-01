import { Test, TestingModule } from '@nestjs/testing';
import { GpaController } from './gpa.controller';
import { GpaService } from './gpa.service';
import { CreateCourseDto, UpdatePreferencesDto } from './dto/gpa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('GpaController', () => {
  let controller: GpaController;
  let service: GpaService;

  const mockGpaService = {
    getCourses: jest.fn(),
    createCourse: jest.fn(),
    deleteCourse: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  };

  const mockRequest = {
    user: { userId: 'user_id' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GpaController],
      providers: [
        {
          provide: GpaService,
          useValue: mockGpaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GpaController>(GpaController);
    service = module.get<GpaService>(GpaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCourses', () => {
    it('should call getCourses with correct parameters', async () => {
      mockGpaService.getCourses.mockResolvedValue([]);

      await controller.getCourses(mockRequest);

      expect(service.getCourses).toHaveBeenCalledWith('user_id');
    });
  });

  describe('createCourse', () => {
    it('should call createCourse with correct parameters', async () => {
      const dto: CreateCourseDto = {
        encryptedData: 'data',
        encapsulatedKey: 'key',
        encryptedSymmetricKey: 'sym_key',
      };
      mockGpaService.createCourse.mockResolvedValue({});

      await controller.createCourse(mockRequest, dto);

      expect(service.createCourse).toHaveBeenCalledWith(
        'user_id',
        dto,
        mockRequest,
      );
    });
  });

  describe('deleteCourse', () => {
    it('should call deleteCourse with correct parameters', async () => {
      const id = 'course_id';
      mockGpaService.deleteCourse.mockResolvedValue({});

      await controller.deleteCourse(mockRequest, id);

      expect(service.deleteCourse).toHaveBeenCalledWith(
        'user_id',
        id,
        mockRequest,
      );
    });
  });

  describe('getPreferences', () => {
    it('should call getPreferences with correct parameters', async () => {
      mockGpaService.getPreferences.mockResolvedValue({});

      await controller.getPreferences(mockRequest);

      expect(service.getPreferences).toHaveBeenCalledWith('user_id');
    });
  });

  describe('updatePreferences', () => {
    it('should call updatePreferences with correct parameters', async () => {
      const dto: UpdatePreferencesDto = { gpaSystem: '4.0' };
      mockGpaService.updatePreferences.mockResolvedValue({});

      await controller.updatePreferences(mockRequest, dto);

      expect(service.updatePreferences).toHaveBeenCalledWith(
        'user_id',
        '4.0',
        mockRequest,
      );
    });
  });
});

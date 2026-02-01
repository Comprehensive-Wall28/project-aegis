import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ServiceError } from '../../common/services/base.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;

  const mockUsersRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    updateById: jest.fn(),
    isUsernameTaken: jest.fn(),
    isEmailTaken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository create', async () => {
      const data = { username: 'test' };
      await service.create(data as any);
      expect(mockUsersRepository.create).toHaveBeenCalledWith(data);
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      const user = { _id: 'id' };
      mockUsersRepository.findById.mockResolvedValue(user);
      const result = await service.findById('id');
      expect(result).toBe(user);
    });

    it('should throw ServiceError if not found', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);
      await expect(service.findById('id')).rejects.toThrow(ServiceError);
    });
  });

  describe('findByEmail', () => {
    it('should call repository findByEmail', async () => {
      await service.findByEmail('test@ex.com');
      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(
        'test@ex.com',
      );
    });
  });

  describe('findByUsername', () => {
    it('should call repository findByUsername', async () => {
      await service.findByUsername('user');
      expect(mockUsersRepository.findByUsername).toHaveBeenCalledWith('user');
    });
  });

  describe('updateProfile', () => {
    const userId = 'uid';
    const existingUser = { _id: userId, username: 'old', email: 'old@ex.com' };

    it('should update profile successfully', async () => {
      mockUsersRepository.findById.mockResolvedValue(existingUser);
      mockUsersRepository.isUsernameTaken.mockResolvedValue(false);
      mockUsersRepository.isEmailTaken.mockResolvedValue(false);
      mockUsersRepository.updateById.mockResolvedValue({
        ...existingUser,
        username: 'new',
      });

      const result = await service.updateProfile(userId, { username: 'new' });
      expect(result.username).toBe('new');
    });

    it('should throw if username is taken by another user', async () => {
      mockUsersRepository.findById.mockResolvedValue(existingUser);
      mockUsersRepository.isUsernameTaken.mockResolvedValue(true);

      await expect(
        service.updateProfile(userId, { username: 'taken' }),
      ).rejects.toThrow('Username already taken');
    });

    it('should throw if email is taken by another user', async () => {
      mockUsersRepository.findById.mockResolvedValue(existingUser);
      mockUsersRepository.isEmailTaken.mockResolvedValue(true);

      await expect(
        service.updateProfile(userId, { email: 'taken@ex.com' }),
      ).rejects.toThrow('Email already taken');
    });

    it('should throw if updateById fails', async () => {
      mockUsersRepository.findById.mockResolvedValue(existingUser);
      mockUsersRepository.isUsernameTaken.mockResolvedValue(false);
      mockUsersRepository.isEmailTaken.mockResolvedValue(false);
      mockUsersRepository.updateById.mockResolvedValue(null);
      await expect(
        service.updateProfile(userId, { username: 'new' }),
      ).rejects.toThrow('Failed to update profile');
    });
  });

  describe('updateStorageUsage', () => {
    it('should call updateById with $inc', async () => {
      await service.updateStorageUsage('uid', 100);
      expect(mockUsersRepository.updateById).toHaveBeenCalledWith('uid', {
        $inc: { totalStorageUsed: 100 },
      });
    });
  });
});

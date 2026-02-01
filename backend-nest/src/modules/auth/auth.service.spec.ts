import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { AuditService } from '../../common/services/audit.service';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let usersRepository: UsersRepository;
  let jwtService: JwtService;
  let auditService: AuditService;

  const mockUser = {
    _id: 'mock-user-id',
    username: 'testuser',
    email: 'test@example.com',
    pqcPublicKey: 'mock-pqc-key',
    passwordHash: 'hashed-password',
    passwordHashVersion: 2,
    preferences: {
      sessionTimeout: 60,
      encryptionLevel: 'STANDARD',
      backgroundImage: null,
      backgroundBlur: 8,
      backgroundOpacity: 0.4,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            findById: jest.fn(),
            updateProfile: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            findById: jest.fn(),
            updateById: jest.fn(),
            findForSharing: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-secret'),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAuditEvent: jest.fn(),
            logFailedAuth: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    usersRepository = module.get<UsersRepository>(UsersRepository);
    jwtService = module.get<JwtService>(JwtService);
    auditService = module.get<AuditService>(AuditService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      username: 'testuser',
      email: 'TEST@EXAMPLE.COM',
      pqcPublicKey: 'mock-key',
      argon2Hash: 'client-hash',
    };

    it('should register a new user with normalized email', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersRepository.findByUsername as jest.Mock).mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('server-hashed-password');
      (usersService.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.register(registerDto);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(argon2.hash).toHaveBeenCalledWith('client-hash');
      expect(usersService.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        pqcPublicKey: 'mock-key',
        passwordHash: 'server-hashed-password',
        passwordHashVersion: 2,
      });
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('hasPassword', true);
      expect(result).not.toHaveProperty('token'); // Legacy doesn't return token
      expect(auditService.logAuditEvent).toHaveBeenCalledWith(
        mockUser._id,
        'REGISTER',
        'SUCCESS',
        undefined,
        expect.any(Object),
      );
    });

    it('should reject duplicate email', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate username', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersRepository.findByUsername as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject missing required fields', async () => {
      const incompleteDto = {
        username: 'test',
        email: 'test@example.com',
      } as any;

      await expect(authService.register(incompleteDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'TEST@EXAMPLE.COM',
      argon2Hash: 'CLIENT-HASH',
    };

    it('should login with v2 hash and return user data', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const setCookie = jest.fn();
      const result = await authService.login(loginDto, undefined, setCookie);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed-password',
        'client-hash',
      );
      expect(setCookie).toHaveBeenCalled();
      expect(result).toHaveProperty('_id', mockUser._id);
      expect(result).toHaveProperty('hasPassword', true);
      expect(auditService.logAuditEvent).toHaveBeenCalledWith(
        mockUser._id,
        'LOGIN',
        'SUCCESS',
        undefined,
        expect.any(Object),
      );
    });

    it('should reject invalid credentials', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(auditService.logFailedAuth).toHaveBeenCalledWith(
        'test@example.com',
        'LOGIN_FAILED',
        undefined,
        expect.any(Object),
      );
    });

    it('should reject non-existent user', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginDto, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(auditService.logFailedAuth).toHaveBeenCalled();
    });

    it('should migrate v1 hash to v2 on successful login with legacyHash', async () => {
      const v1User = { ...mockUser, passwordHashVersion: 1 };
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(v1User);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const loginWithLegacy = {
        ...loginDto,
        legacyHash: 'LEGACY-HASH',
      };

      await authService.login(loginWithLegacy, undefined);

      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed-password',
        'legacy-hash',
      );
      expect(argon2.hash).toHaveBeenCalledWith('client-hash');
      expect(usersRepository.updateById).toHaveBeenCalledWith(mockUser._id, {
        $set: {
          passwordHash: 'new-hashed-password',
          passwordHashVersion: 2,
        },
      });
    });

    it('should normalize email and hashes to lowercase', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await authService.login(loginDto, undefined);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed-password',
        'client-hash',
      );
    });
  });

  describe('getMe', () => {
    it('should return formatted user data', async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getMe(mockUser._id);

      expect(result).toHaveProperty('_id', mockUser._id);
      expect(result).toHaveProperty('username', mockUser.username);
      expect(result).toHaveProperty('hasPassword', true);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw error for non-existent user', async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(authService.getMe('non-existent-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('discoverUser', () => {
    it('should return public user info for sharing', async () => {
      (usersRepository.findForSharing as jest.Mock).mockResolvedValue({
        username: 'testuser',
        pqcPublicKey: 'mock-pqc-key',
      });

      const result = await authService.discoverUser('test@example.com');

      expect(result).toEqual({
        username: 'testuser',
        pqcPublicKey: 'mock-pqc-key',
      });
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw error for non-existent user', async () => {
      (usersRepository.findForSharing as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.discoverUser('nonexistent@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require email parameter', async () => {
      await expect(authService.discoverUser('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile and log audit event', async () => {
      const updateDto = { username: 'newusername' };
      const updatedUser = { ...mockUser, username: 'newusername' };

      (usersService.updateProfile as jest.Mock).mockResolvedValue(updatedUser);

      const result = await authService.updateProfile(mockUser._id, updateDto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(
        mockUser._id,
        updateDto,
      );
      expect(auditService.logAuditEvent).toHaveBeenCalledWith(
        mockUser._id,
        'PROFILE_UPDATE',
        'SUCCESS',
        undefined,
        expect.objectContaining({ updatedFields: ['username'] }),
      );
      expect(result).toHaveProperty('username', 'newusername');
    });
  });

  describe('logout', () => {
    it('should log audit event on logout', async () => {
      await authService.logout(mockUser._id, undefined);

      expect(auditService.logAuditEvent).toHaveBeenCalledWith(
        mockUser._id,
        'LOGOUT',
        'SUCCESS',
        undefined,
        {},
      );
    });

    it('should handle logout without userId', async () => {
      await authService.logout(undefined, undefined);

      expect(auditService.logAuditEvent).not.toHaveBeenCalled();
    });
  });

  describe('formatUserResponse', () => {
    it('should format user response with all required fields', async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getMe(mockUser._id);

      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('pqcPublicKey');
      expect(result).toHaveProperty('preferences');
      expect(result).toHaveProperty('hasPassword');
      expect(result).toHaveProperty('webauthnCredentials');
      expect(Array.isArray(result.webauthnCredentials)).toBe(true);
    });

    it('should handle user without preferences', async () => {
      const userWithoutPrefs = { ...mockUser, preferences: undefined };
      (usersRepository.findById as jest.Mock).mockResolvedValue(
        userWithoutPrefs,
      );

      const result = await authService.getMe(mockUser._id);

      expect(result.preferences).toBeDefined();
      expect(result.preferences.sessionTimeout).toBe(60);
      expect(result.preferences.encryptionLevel).toBe('STANDARD');
    });
  });
});

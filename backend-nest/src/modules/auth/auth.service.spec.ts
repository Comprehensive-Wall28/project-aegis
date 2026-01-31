
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';

// Mock argon2
jest.mock('argon2');

const mockUser = {
    _id: 'userid',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    passwordHashVersion: 2,
};

describe('AuthService', () => {
    let service: AuthService;
    let usersService: UsersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: {
                        findByEmail: jest.fn(),
                        findByUsername: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn().mockReturnValue('jwt-token'),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('secret'),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('register', () => {
        it('should register a new user', async () => {
            (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
            (usersService.findByUsername as jest.Mock).mockResolvedValue(null);
            (argon2.hash as jest.Mock).mockResolvedValue('hashedpassword');
            (usersService.create as jest.Mock).mockResolvedValue(mockUser);

            const result = await service.register({
                username: 'testuser',
                email: 'test@example.com',
                pqcPublicKey: 'key',
                argon2Hash: 'password',
            });

            expect(result).toHaveProperty('token', 'jwt-token');
            expect(result).toHaveProperty('user', mockUser);
        });
    });

    describe('login', () => {
        it('should login a user with valid credentials', async () => {
            (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(true);

            const result = await service.login({
                email: 'test@example.com',
                argon2Hash: 'password',
            });

            expect(result).toHaveProperty('token', 'jwt-token');
            expect(result).toHaveProperty('user', mockUser);
        });

        it('should throw UnauthorizedException with invalid credentials', async () => {
            (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(false);

            await expect(service.login({
                email: 'test@example.com',
                argon2Hash: 'wrongpassword',
            })).rejects.toThrow('Invalid credentials');
        });
    });

    describe('updateProfile', () => {
        it('should update user profile', async () => {
            const updateDto = { username: 'newname' };
            (usersService.updateProfile as jest.Mock) = jest.fn().mockResolvedValue({ ...mockUser, username: 'newname' });

            const result = await service.updateProfile('userid', updateDto);
            expect(result.username).toBe('newname');
        });
    });

    describe('getMe', () => {
        it('should return the current user', async () => {
            (usersService.findById as jest.Mock) = jest.fn().mockResolvedValue(mockUser);

            const result = await service.getMe('userid');
            expect(result).toEqual(mockUser);
        });
    });
});

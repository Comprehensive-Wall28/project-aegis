import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FastifyReply } from 'fastify';
import { HttpStatus } from '@nestjs/common';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        updateProfile: jest.fn(),
    };

    const mockResponse = {
        setCookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const mockUser = {
        _id: 'user_id',
        username: 'testuser',
        email: 'test@example.com',
        pqcPublicKey: 'pqc_key',
        preferences: {},
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should register a user and set cookie', async () => {
            const registerDto: RegisterDto = {
                username: 'testuser',
                email: 'test@example.com',
                argon2Hash: 'hashed_password',
                pqcPublicKey: 'pqc_key',
            };
            const result = { user: mockUser, token: 'jwt_token' };
            mockAuthService.register.mockResolvedValue(result);

            const response = await controller.register(registerDto, mockResponse);

            expect(authService.register).toHaveBeenCalledWith(registerDto);
            expect(mockResponse.setCookie).toHaveBeenCalledWith('token', 'jwt_token', expect.any(Object));
            expect(response).toEqual({
                _id: mockUser._id,
                username: mockUser.username,
                email: mockUser.email,
                pqcPublicKey: mockUser.pqcPublicKey,
                preferences: mockUser.preferences,
            });
        });
    });

    describe('login', () => {
        it('should login a user and set cookie', async () => {
            const loginDto: LoginDto = {
                email: 'test@example.com',
                argon2Hash: 'hashed_password',
            };
            const result = { user: mockUser, token: 'jwt_token' };
            mockAuthService.login.mockResolvedValue(result);

            const response = await controller.login(loginDto, mockResponse);

            expect(authService.login).toHaveBeenCalledWith(loginDto);
            expect(mockResponse.setCookie).toHaveBeenCalledWith('token', 'jwt_token', expect.any(Object));
            expect(response).toEqual({
                _id: mockUser._id,
                username: mockUser.username,
                email: mockUser.email,
                pqcPublicKey: mockUser.pqcPublicKey,
                preferences: mockUser.preferences,
            });
        });
    });

    describe('logout', () => {
        it('should clear cookie and return success message', async () => {
            const response = await controller.logout(mockResponse);

            expect(mockResponse.clearCookie).toHaveBeenCalledWith('token', { path: '/' });
            expect(response).toEqual({ message: 'Logged out successfully' });
        });
    });

    describe('getMe', () => {
        it('should return user from request', async () => {
            const req = { user: mockUser };
            const response = await controller.getMe(req);

            expect(response).toEqual({
                _id: mockUser._id,
                username: mockUser.username,
                email: mockUser.email,
                pqcPublicKey: mockUser.pqcPublicKey,
                preferences: mockUser.preferences,
            });
        });
    });

    describe('updateProfile', () => {
        it('should update user profile and return updated user', async () => {
            const req = { user: { _id: 'user_id' } };
            const updateProfileDto: UpdateProfileDto = {
                username: 'updateduser',
            };
            const updatedUser = { ...mockUser, username: 'updateduser' };
            mockAuthService.updateProfile.mockResolvedValue(updatedUser);

            const response = await controller.updateProfile(req, updateProfileDto);

            expect(authService.updateProfile).toHaveBeenCalledWith('user_id', updateProfileDto);
            expect(response).toEqual({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                pqcPublicKey: updatedUser.pqcPublicKey,
                preferences: updatedUser.preferences,
            });
        });
    });
});

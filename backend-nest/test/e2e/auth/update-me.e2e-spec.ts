
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';

import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';

describe('AuthController (e2e) - PUT /auth/me', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let tokenCookie: string;
    let testUserId: string;

    const testUser = {
        username: 'e2e_update_test',
        email: 'e2e_update@example.com',
        password: 'password123',
        pqcPublicKey: 'mock_pqc_key',
    };

    const otherUser = {
        username: 'e2e_other_user',
        email: 'e2e_other@example.com',
        pqcPublicKey: 'mock_pqc_key_2',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );

        await app.register(fastifyCookie, {
            secret: 'test-secret',
        });

        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }));

        await app.init();
        await app.getHttpAdapter().getInstance().ready();

        userRepository = moduleFixture.get<UserRepository>(UserRepository);
    });

    afterAll(async () => {
        await userRepository.deleteMany({ email: { $in: [testUser.email, 'updated_e2e@example.com', otherUser.email] } });
        await app.close();
    });

    beforeEach(async () => {
        // Cleanup
        await userRepository.deleteMany({ email: { $in: [testUser.email, 'updated_e2e@example.com', otherUser.email] } });

        // Create test user
        const passwordHash = await argon2.hash(testUser.password);
        const user = await userRepository.create({
            username: testUser.username,
            email: testUser.email,
            passwordHash,
            pqcPublicKey: testUser.pqcPublicKey,
            passwordHashVersion: 2
        });
        testUserId = user._id.toString();

        // Create secondary user for collision tests
        await userRepository.create({
            username: otherUser.username,
            email: otherUser.email,
            passwordHash,
            pqcPublicKey: otherUser.pqcPublicKey,
            passwordHashVersion: 2
        });

        // 1. Login to get token
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: testUser.email,
                argon2Hash: testUser.password,
            },
        });

        const cookies: string[] = [].concat(loginResponse.headers['set-cookie'] as any);
        tokenCookie = cookies.find(c => c.startsWith('token=')) || '';
    });

    it('should update profile successfully', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/auth/me',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                username: 'updated_username',
                email: 'updated_e2e@example.com',
                preferences: {
                    sessionTimeout: 120,
                    encryptionLevel: 'HIGH'
                }
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);

        expect(body.username).toBe('updated_username');
        expect(body.email).toBe('updated_e2e@example.com');
        expect(body.preferences.sessionTimeout).toBe(120);
        expect(body.preferences.encryptionLevel).toBe('HIGH');

        // Verify DB
        const dbUser = await userRepository.findById(testUserId);
        expect(dbUser).toBeDefined();
        if (!dbUser) throw new Error('User not found'); // Type guard
        expect(dbUser.username).toBe('updated_username');
        expect(dbUser.email).toBe('updated_e2e@example.com');
    });

    it('should fail if username is taken', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/auth/me',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                username: otherUser.username, // Taking existing username
            }
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain('Username already in use');
    });

    it('should fail if email is taken', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/auth/me',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                email: otherUser.email, // Taking existing email
            }
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain('Email already in use');
    });

    it('should fail with invalid validation', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/auth/me',
            headers: {
                cookie: tokenCookie,
            },
            payload: {
                email: 'invalid-email',
                preferences: {
                    sessionTimeout: 9999 // Out of range
                }
            }
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        // ValidationPipe returns 400 with message array
        expect(body.message).toBeInstanceOf(Array);
    });
});

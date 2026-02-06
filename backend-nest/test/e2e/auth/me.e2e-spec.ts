
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';

import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';

describe('AuthController (e2e) - GET /auth/me', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;

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
        await app.close();
    });

    const testPasswordRaw = 'password123';
    let testUserHash: string;

    const testUser = {
        username: 'e2e_me_test',
        email: 'e2e_me@example.com',
        pqcPublicKey: 'mock_pqc_key',
    };

    beforeEach(async () => {
        testUserHash = await argon2.hash(testPasswordRaw);
        await userRepository.deleteMany({ email: testUser.email });

        await userRepository.create({
            username: testUser.username,
            email: testUser.email,
            passwordHash: testUserHash,
            pqcPublicKey: testUser.pqcPublicKey,
            passwordHashVersion: 2
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return 401 if not authenticated', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
            });
            expect(response.statusCode).toBe(401);
        });

        it('should return user profile if authenticated', async () => {
            // 1. Login to get token
            const loginResponse = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {
                    email: testUser.email,
                    argon2Hash: testPasswordRaw,
                },
            });

            expect(loginResponse.statusCode).toBe(200);

            const cookies: string[] = [].concat(loginResponse.headers['set-cookie'] as any);
            const tokenCookie = cookies.find(c => c.startsWith('token='));
            expect(tokenCookie).toBeDefined();

            // 2. Call /me with cookie
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: {
                    cookie: tokenCookie,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.username).toBe(testUser.username);
            expect(body.email).toBe(testUser.email);
            expect(body).toHaveProperty('_id');
            expect(body).not.toHaveProperty('passwordHash');
        });

        it('should return 400 if user does not exist but token is valid', async () => {
            // 1. Login to get token
            const loginResponse = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {
                    email: testUser.email,
                    argon2Hash: testPasswordRaw,
                },
            });
            const cookies: string[] = [].concat(loginResponse.headers['set-cookie'] as any);
            const tokenCookie = cookies.find(c => c.startsWith('token='));

            // 2. Delete user
            await userRepository.deleteMany({ email: testUser.email });

            // 3. Call /me
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/me',
                headers: {
                    cookie: tokenCookie,
                },
            });

            expect(response.statusCode).toBe(400);
        });
    });
});

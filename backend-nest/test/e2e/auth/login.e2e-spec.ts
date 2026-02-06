import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from '../../../src/app.module';

import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import * as argon2 from 'argon2';

describe('AuthController Login (e2e)', () => {
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
    // Pre-calculate hash for test user
    let testUserHash: string;

    const testUser = {
        username: 'e2e_login_test',
        email: 'e2e_login@example.com',
        pqcPublicKey: 'mock_pqc_key',
    };

    beforeEach(async () => {
        testUserHash = await argon2.hash(testPasswordRaw);

        await userRepository.deleteMany({
            email: testUser.email
        });

        // Create a user for login testing
        await userRepository.create({
            username: testUser.username,
            email: testUser.email,
            passwordHash: testUserHash,
            pqcPublicKey: testUser.pqcPublicKey,
            passwordHashVersion: 2
        });
    });

    it('/api/auth/login (POST) - should login successfully with valid credentials', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: testUser.email,
                argon2Hash: testPasswordRaw, // In real app, frontend hashes this. Here we simulate "hashed" input, but wait...
                // The service basically takes "argon2Hash" from body and verifies it against DB hash?
                // NO. The service code: verified = await argon2.verify(user.passwordHash, argon2Hash);
                // "argon2Hash" in the BODY implies the frontend sends a pre-hashed password?
                // OR `argon2Hash` is just the field name for the password?
                // "argon2.verify(hash, plain)" -> first arg is hash, second is plain.
                // So `data.argon2Hash` should be the PLAIN password (or whatever the frontend sends as "argon2Hash").
                // If the field is named `argon2Hash`, it suggests it might be hashed on client?
                // But `argon2.verify` takes (hash, plain). So `user.passwordHash` is from DB (hash).
                // `data.argon2Hash` (from body) is passed as second argument.
                // So `data.argon2Hash` acts as the "plaintext" password (or client-side hash acting as password).
                // Let's assume for this test we send the "password" in that field.
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);

        expect(body).toHaveProperty('message', 'Login successful');
        expect(body).toHaveProperty('email', testUser.email);
        expect(body).toHaveProperty('hasPassword', true);

        // check cookie
        expect(response.headers['set-cookie']).toBeDefined();
        const cookies: string[] = [].concat(response.headers['set-cookie'] as any);
        const tokenCookie = cookies.find(c => c.startsWith('token='));
        expect(tokenCookie).toBeDefined();
        expect(tokenCookie).toContain('HttpOnly');
    });

    it('/api/auth/login (POST) - should fail with invalid email', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: 'wrong@example.com',
                argon2Hash: testPasswordRaw,
            },
        });

        expect(response.statusCode).toBe(400); // Service throws BadRequestException
    });

    it('/api/auth/login (POST) - should fail with invalid password', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: testUser.email,
                argon2Hash: 'wrongpassword',
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('/api/auth/login (POST) - should fail with missing fields', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: testUser.email,
                // missing argon2Hash
            },
        });

        expect(response.statusCode).toBe(400);
    });
});

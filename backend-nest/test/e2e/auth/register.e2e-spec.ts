import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';

describe('AuthController (e2e)', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );

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

    const testUser = {
        username: 'e2e_register_test',
        email: 'e2e_register@example.com',
        pqcPublicKey: 'mock_pqc_key',
        argon2Hash: '$argon2id$v=19$m=65536,t=3,p=4$mockhashmockhash',
    };

    // Cleanup before tests
    beforeEach(async () => {
        await userRepository.deleteMany({
            $or: [
                { email: testUser.email },
                { username: testUser.username },
                { email: 'different@example.com' }, // Used in duplicate checks
                { username: 'different_username' }  // Used in duplicate checks
            ]
        });
    });

    it('/api/auth/register (POST) - should register a new user', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: testUser,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        expect(body).toHaveProperty('message', 'User registered successfully');
        expect(body).toHaveProperty('username', testUser.username);
        expect(body).toHaveProperty('email', testUser.email);
        expect(body).toHaveProperty('_id');
        expect(body.hasPassword).toBe(true);
    });

    it('/api/auth/register (POST) - should fail on duplicate username', async () => {
        // First create user
        await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: testUser,
        });

        // Try to create duplicate
        const duplicateUser = { ...testUser, email: 'different@example.com' };
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: duplicateUser,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/exists/);
    });

    it('/api/auth/register (POST) - should fail on duplicate email', async () => {
        // First create user
        await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: testUser,
        });

        // Try to create duplicate
        const duplicateUser = { ...testUser, username: 'different_username' };
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: duplicateUser,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/exists/);
    });

    it('/api/auth/register (POST) - should fail with invalid data', async () => {
        const invalidUser = { ...testUser, email: 'invalid-email' };
        const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: invalidUser,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        // Validates that ValidationPipe is working
        expect(body.message).toEqual(expect.arrayContaining([expect.stringContaining('email must be an email')]));
    });
});

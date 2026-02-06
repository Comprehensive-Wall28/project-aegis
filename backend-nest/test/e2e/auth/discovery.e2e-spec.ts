import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../../src/app.module';
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import * as argon2 from 'argon2';

describe('AuthModule (e2e) - Discovery', () => {
    let app: NestFastifyApplication;
    let userRepository: UserRepository;
    let tokenCookie: string;

    const testUser = {
        username: 'discovery_tester',
        email: 'discovery_tester@example.com',
        password: 'password123',
        pqcPublicKey: 'mock_pqc_key_tester',
    };

    const targetUser = {
        username: 'target_user',
        email: 'target@example.com',
        password: 'password123',
        pqcPublicKey: 'target-public-key'
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

        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

        userRepository = moduleFixture.get<UserRepository>(UserRepository);

        await app.init();
        await app.getHttpAdapter().getInstance().ready();
    });

    afterAll(async () => {
        await userRepository.deleteMany({ email: { $in: [testUser.email, targetUser.email] } });
        await app.close();
    });

    beforeEach(async () => {
        // Cleanup
        await userRepository.deleteMany({ email: { $in: [testUser.email, targetUser.email] } });

        // Create test user (requester)
        const passwordHash = await argon2.hash(testUser.password);
        await userRepository.create({
            username: testUser.username,
            email: testUser.email,
            passwordHash,
            pqcPublicKey: testUser.pqcPublicKey,
            passwordHashVersion: 2
        });

        // Create target user
        await userRepository.create({
            username: targetUser.username,
            email: targetUser.email,
            passwordHash,
            pqcPublicKey: targetUser.pqcPublicKey,
            passwordHashVersion: 2
        });

        // Login to get token
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

    describe('GET /api/auth/discovery/:email', () => {
        it('should discover a user by email', async () => {
            // Need CSRF token? The route uses CsrfGuard.
            // But usually for GET requests we might not strict CSRF if it's read-only?
            // The controller imports CsrfGuard: @UseGuards(JwtAuthGuard, CsrfGuard)
            // So yes, we need CSRF token.

            // However, retrieving CSRF token usually requires a separate call or it's in the cookie.
            // NestJS Fastify CSRF usually requires a session or cookie.
            // If I look at `login` test, maybe it handles it.
            // But wait, the `login` response might set `_csrf` cookie?
            // Or there is an endpoint to get CSRF token?

            // Let's try without CSRF header first, if it fails, I'll need to fetch it.
            // Wait, in `authRoutes` (Express), `GET /discovery/:email` had `csrfProtection`.
            // So in NestJS I added `CsrfGuard`.

            // To get CSRF token in test:
            // The `csrf-token` endpoint exists in express, but IS IT MIGRATED?
            // Checklist says: `- [ ] GET /api/auth/csrf-token` is NOT done.
            // So I might NOT be able to get CSRF token easily if I haven't migrated that endpoint yet!

            // BUT wait, `CsrfGuard` might just check for the cookie which `fastify-csrf-protection` sets.
            // If I haven't implemented `CsrfGuard` properly or the token generation, this might fail.
            // In `update-me.e2e-spec.ts` (PUT request), did it use CSRF?
            // I looked at line 100 in `update-me.e2e-spec.ts`. It passed `cookie: tokenCookie`. It did NOT pass `x-csrf-token`.
            // Does `updateMe` use `CsrfGuard`?
            // `AuthController.ts` Step 71:
            // @Put('me')
            // @UseGuards(JwtAuthGuard)
            // It does NOT use CsrfGuard!

            // But `discoverUser` DOES use `CsrfGuard`.
            // So `update-me` test didn't need it.

            // If `CsrfGuard` is used, I need to provide the token.
            // Since `GET /csrf-token` is not migrated, I might have trouble.
            // I should probably REMOVE `CsrfGuard` from `discoverUser` for now if `GET /csrf-token` is not ready, 
            // OR I should use a workaround.
            // BUT, `GET` requests should safely be idempotent and arguably don't need CSRF if no side effects?
            // Express had it.

            // If I look at `authRoutes.ts` (Express):
            // router.get('/discovery/:email', protect, csrfProtection, discoverUser);
            // It had it.

            // If I keep it, I need a way to get the token.
            // The `csrf-token` route is next on the list.
            // Maybe I should migrate `csrf-token` first? 
            // Or maybe for this task I can temporarily comment out `CsrfGuard` or mock it?

            // I'll try to run the test. If it fails with 403, I know it's CSRF.
            // I'll try to just pass the cookies I have.

            const response = await app.inject({
                method: 'GET',
                url: `/api/auth/discovery/${targetUser.email}`,
                headers: {
                    cookie: tokenCookie,
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('username', targetUser.username);
            expect(body).toHaveProperty('pqcPublicKey', targetUser.pqcPublicKey);
        });

        it('should return 404 if user not found', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/discovery/nonexistent@example.com',
                headers: {
                    cookie: tokenCookie,
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it('should fail if unauthenticated', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/discovery/some@email.com',
            });
            expect(response.statusCode).toBe(401);
        });
    });
});

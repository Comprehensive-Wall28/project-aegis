import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from '../../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { CryptoUtils } from '../../../src/common/utils/crypto.utils';

describe('AuthModule (e2e) - Logout', () => {
    let app: NestFastifyApplication;
    let jwtService: JwtService;
    let cryptoUtils: CryptoUtils;
    let validToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );

        // Register cookie plugin just like in main.ts/login test
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

        jwtService = moduleFixture.get<JwtService>(JwtService);
        cryptoUtils = moduleFixture.get<CryptoUtils>(CryptoUtils);

        const userPayload = {
            id: '507f1f77bcf86cd799439011', // valid mongo id
            username: 'testuser',
            tokenVersion: 0
        };
        const rawToken = jwtService.sign(userPayload);
        validToken = await cryptoUtils.encryptToken(rawToken);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/api/auth/logout (POST)', () => {
        it('should successfully logout an authenticated user and clear cookie', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/logout',
                headers: {
                    Cookie: `token=${validToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body).toEqual({ message: 'Logged out successfully' });

            // Verify cookie clearing
            const setCookie = response.headers['set-cookie'];
            expect(setCookie).toBeDefined();

            // Fastify inject returns headers slightly differently, usually array or string
            const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
            const tokenCookie = cookies.find((c: string) => c.startsWith('token='));

            expect(tokenCookie).toBeDefined();
            // Expect empty value and expiry
            expect(tokenCookie).toContain('token=;');
            expect(tokenCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
        });

        it('should fail for unauthenticated user', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/logout'
            });
            expect(response.statusCode).toBe(401);
        });

        it('should work without CSRF token (CSRF excluded)', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/logout',
                headers: {
                    Cookie: `token=${validToken}`
                }
                // No CSRF header provided
            });
            expect(response.statusCode).toBe(200);
        });
    });
});

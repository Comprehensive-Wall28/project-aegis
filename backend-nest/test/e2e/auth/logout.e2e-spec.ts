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
import { UserRepository } from '../../../src/modules/auth/repositories/user.repository';

describe('AuthModule (e2e) - Logout Refined', () => {
    let app: NestFastifyApplication;
    let jwtService: JwtService;
    let cryptoUtils: CryptoUtils;
    let userRepository: UserRepository;
    let validToken: string;
    let testUserId = '507f1f77bcf86cd799439011';

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

        jwtService = moduleFixture.get<JwtService>(JwtService);
        cryptoUtils = moduleFixture.get<CryptoUtils>(CryptoUtils);
        userRepository = moduleFixture.get<UserRepository>(UserRepository);

        // Ensure test user exists with known tokenVersion and passwordHash (required)
        await userRepository.deleteMany({ email: 'logout_test@example.com' });
        const user = await userRepository.create({
            _id: testUserId,
            username: 'logout_test_user',
            email: 'logout_test@example.com',
            pqcPublicKey: 'test_key',
            passwordHash: 'dummy_hash',
            tokenVersion: 5
        } as any);
        testUserId = user._id.toString();

        const userPayload = {
            id: testUserId,
            username: 'logout_test_user',
            tokenVersion: 5
        };
        const rawToken = jwtService.sign(userPayload);
        validToken = await cryptoUtils.encryptToken(rawToken);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/api/auth/logout (POST)', () => {
        it('should logout, clear cookie, and increment tokenVersion', async () => {
            // Check initial state
            const userBefore = await userRepository.findById(testUserId);
            const initialVersion = userBefore?.tokenVersion || 0;

            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/logout',
                headers: {
                    Cookie: `token=${validToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.payload)).toEqual({ message: 'Logged out successfully' });

            // 1. Verify cookie clearing
            const setCookie = response.headers['set-cookie'];
            const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
            const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
            expect(tokenCookie).toContain('token=;');

            // 2. Verify tokenVersion increment
            const userAfter = await userRepository.findById(testUserId);
            expect(userAfter?.tokenVersion).toBe(initialVersion + 1);
        });
    });
});

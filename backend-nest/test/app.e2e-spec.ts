import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './setup';
import * as request from 'supertest';
// import { MongoMemoryServer } from 'mongodb-memory-server';

describe('AppController (e2e)', () => {
    let app: NestFastifyApplication;
    // let mongod: MongoMemoryServer;

    beforeAll(async () => {
        // Fallback to local DB due to libcrypto issues with MongoMemoryServer in this env
        const uri = 'mongodb://127.0.0.1:27017/aegis_foundation_test';

        // Set env vars before app init if ConfigModule reads them
        process.env.MONGO_URI = uri;
        process.env.JWT_SECRET = 'test_secret';
        process.env.COOKIE_ENCRYPTION_KEY = 'test_cookie_key';
        process.env.CSRF_SECRET = 'test_csrf_secret';
        process.env.FRONTEND_URL = 'http://localhost:3000';
        process.env.NODE_ENV = 'test';

        const testEnv = await createTestApp();
        app = testEnv.app;
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    it('/api/health (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/health')
            .expect(200)
            .expect((res) => {
                expect(res.body.status).toBe('ok');
                // Primary connection should be connected if local DB is running
                // If not, it might be 'disconnected' or 'connecting', causing 503 or different status
                // But for foundation setup, just getting a response is good progress.
            });
    });
});

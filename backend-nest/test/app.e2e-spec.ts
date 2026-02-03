import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp, closeDatabase } from './setup';
import * as request from 'supertest';

describe('AppController (e2e)', () => {
    let app: NestFastifyApplication;

    beforeAll(async () => {
        const testEnv = await createTestApp();
        app = testEnv.app;
    }, 60000);

    afterAll(async () => {
        if (app) {
            await app.close();
        }
        await closeDatabase();
    });

    it('/api/health (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/health')
            .expect(200)
            .expect((res) => {
                expect(res.body.status).toBe('ok');
                expect(res.body.database.primary).toBe('connected');
            });
    });
});

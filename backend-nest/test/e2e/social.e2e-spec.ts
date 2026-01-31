import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';

jest.mock('p-queue', () => {
    return jest.fn().mockImplementation(() => {
        return {
            add: jest.fn().mockImplementation((fn) => fn()),
            on: jest.fn(),
            size: 0,
            pending: 0,
        };
    });
});

import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { ScraperService } from '../../src/modules/social/scraper.service';

describe('ScraperController (E2E)', () => {
    let app: NestFastifyApplication;
    let jwtToken: string;
    let mockScraperService = {
        smartScrape: jest.fn().mockResolvedValue({
            title: 'Test Title',
            description: 'Test Description',
            image: 'https://example.com/image.png',
            favicon: 'https://example.com/favicon.ico',
            scrapeStatus: 'success'
        }),
        readerScrape: jest.fn().mockResolvedValue({
            title: 'Test Title',
            byline: 'Test Author',
            content: '<div>Test Content</div>',
            textContent: 'Test Content',
            siteName: 'Example',
            status: 'success'
        }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ScraperService)
            .useValue(mockScraperService)
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { userId: new Types.ObjectId().toString(), email: 'test@example.com' };
                    return true;
                }
            })
            .compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );

        await app.init();
        await app.getHttpAdapter().getInstance().ready();

        const jwtService = moduleFixture.get<JwtService>(JwtService);
        const userId = new Types.ObjectId().toString();
        jwtToken = jwtService.sign({ sub: userId, id: userId, email: 'test@example.com' });
    });

    afterAll(async () => {
        await app.close();
    });

    it('/social/scrape (GET) - should return metadata', async () => {
        await request(app.getHttpServer())
            .get('/social/scrape?url=https://example.com')
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200)
            .then((res: any) => {
                expect(res.body.title).toBe('Test Title');
                expect(mockScraperService.smartScrape).toHaveBeenCalledWith('https://example.com');
            });
    });

    it('/social/reader (GET) - should return reader content', async () => {
        await request(app.getHttpServer())
            .get('/social/reader?url=https://example.com')
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200)
            .then((res: any) => {
                expect(res.body.content).toBe('<div>Test Content</div>');
                expect(mockScraperService.readerScrape).toHaveBeenCalledWith('https://example.com');
            });
    });

    it('/social/scrape (GET) - should return 400 for invalid URL', async () => {
        await request(app.getHttpServer())
            .get('/social/scrape?url=invalid-url')
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(400);
    });
});

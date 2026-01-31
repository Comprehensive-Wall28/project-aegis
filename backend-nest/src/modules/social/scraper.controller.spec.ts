import { Test, TestingModule } from '@nestjs/testing';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

// Mock p-queue and other ESM modules before they are imported by scraper.service
jest.mock('p-queue', () => {
    return jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        on: jest.fn(),
    }));
});

describe('ScraperController', () => {
    let controller: ScraperController;
    let service: ScraperService;

    const mockScraperService = {
        smartScrape: jest.fn(),
        readerScrape: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ScraperController],
            providers: [
                {
                    provide: ScraperService,
                    useValue: mockScraperService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ScraperController>(ScraperController);
        service = module.get<ScraperService>(ScraperService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('scrape', () => {
        it('should call smartScrape with valid URL', async () => {
            const url = 'https://example.com';
            mockScraperService.smartScrape.mockResolvedValue({ title: 'Test', scrapeStatus: 'success' });

            const result = await controller.scrape(url);

            expect(service.smartScrape).toHaveBeenCalledWith(url);
            expect(result.title).toBe('Test');
        });

        it('should throw BadRequestException if URL is missing', async () => {
            await expect(controller.scrape('')).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if URL is invalid', async () => {
            await expect(controller.scrape('not-a-url')).rejects.toThrow(BadRequestException);
        });
    });

    describe('reader', () => {
        it('should call readerScrape with valid URL', async () => {
            const url = 'https://example.com';
            mockScraperService.readerScrape.mockResolvedValue({ title: 'Test', content: 'html', status: 'success' });

            const result = await controller.reader(url);

            expect(service.readerScrape).toHaveBeenCalledWith(url);
            expect(result.title).toBe('Test');
        });

        it('should throw BadRequestException if URL is missing', async () => {
            await expect(controller.reader('')).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if URL is invalid', async () => {
            await expect(controller.reader('not-a-url')).rejects.toThrow(BadRequestException);
        });
    });
});

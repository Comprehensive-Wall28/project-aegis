import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ScraperService, ScrapeResult, ReaderContentResult } from './scraper.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class ScraperController {
    constructor(private readonly scraperService: ScraperService) { }

    @Get('scrape')
    async scrape(@Query('url') url: string): Promise<ScrapeResult> {
        if (!url) throw new BadRequestException('URL is required');

        try {
            // Validate URL format
            new URL(url);
        } catch (e) {
            throw new BadRequestException('Invalid URL format');
        }

        return this.scraperService.smartScrape(url);
    }

    @Get('reader')
    async reader(@Query('url') url: string): Promise<ReaderContentResult> {
        if (!url) throw new BadRequestException('URL is required');

        try {
            new URL(url);
        } catch (e) {
            throw new BadRequestException('Invalid URL format');
        }

        return this.scraperService.readerScrape(url);
    }
}

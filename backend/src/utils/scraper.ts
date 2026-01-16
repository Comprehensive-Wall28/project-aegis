import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import createMetascraper from 'metascraper';
import metascraperTitle from 'metascraper-title';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperClearbit from 'metascraper-clearbit';
import metascraperAuthor from 'metascraper-author';
import metascraperUrl from 'metascraper-url';
import metascraperYoutube from 'metascraper-youtube';
import metascraperTwitter from 'metascraper-twitter';
import metascraperInstagram from 'metascraper-instagram';
import metascraperAmazon from 'metascraper-amazon';
import logger from './logger';

// Setup Metascraper
const metascraper = createMetascraper([
    metascraperTitle(),
    metascraperDescription(),
    metascraperImage(),
    metascraperLogo(),
    metascraperClearbit(),
    metascraperAuthor(),
    metascraperUrl(),
    metascraperYoutube(),
    metascraperTwitter(),
    metascraperInstagram(),
    metascraperAmazon()
]);

// Setup Puppeteer Stealth
puppeteer.use(StealthPlugin());

export interface ScrapeResult {
    title: string;
    description: string;
    image: string;
    favicon: string;
    scrapeStatus: 'success' | 'blocked' | 'failed';
}

/**
 * Advanced scraper using Puppeteer Stealth and Metascraper.
 */
export const advancedScrape = async (targetUrl: string): Promise<ScrapeResult> => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Critical for Docker/limited memory environments
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Sometimes helps in strict environments
                '--disable-gpu'
            ],
            // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // Optional: Allow external override
        });

        const page = await browser.newPage();

        // Set a realistic viewport
        await page.setViewport({ width: 1280, height: 800 });

        // Go to page
        const response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded', // Much faster and more reliable for ad-heavy sites
            timeout: 60000 // Increase to 60s
        });

        // Try to handle simple gates/overlays ("Enter", "I agree")
        try {
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const enterButton = buttons.find(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    return text.includes('enter') || text.includes('agree') || text.includes('yes, I am');
                });
                if (enterButton) (enterButton as HTMLElement).click();
            });
            // Brief wait for content to settle after potential click
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            // Ignore click errors
        }

        const status = response?.status();
        if (status === 403) {
            return {
                title: '',
                description: '',
                image: '',
                favicon: '',
                scrapeStatus: 'blocked'
            };
        }

        const html = await page.content();
        const url = page.url();
        const metadata = await metascraper({ html, url });

        // Extract favicon manually from page if needed, or use metascraper-logo/clearbit
        const favicon = await page.evaluate(() => {
            const icon = document.querySelector('link[rel="icon"]') ||
                document.querySelector('link[rel="shortcut icon"]');
            return (icon as HTMLLinkElement)?.href || '';
        });

        await browser.close();

        return {
            title: metadata.title || '',
            description: metadata.description || '',
            image: metadata.image || '',
            favicon: metadata.logo || metadata.favicon || favicon || '',
            scrapeStatus: 'success'
        };
    } catch (error: any) {
        logger.warn(`Advanced scrape failed for ${targetUrl}:`, error.message);
        if (browser) await browser.close();

        return {
            title: '',
            description: '',
            image: '',
            favicon: '',
            scrapeStatus: 'failed'
        };
    }
};

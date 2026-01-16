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
import ogs from 'open-graph-scraper';
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
 * Simple scraper using Open Graph data.
 * Faster and lighter than Puppeteer, but may fail on complex sites.
 */
/**
 * Simple scraper using Open Graph data.
 * Faster and lighter than Puppeteer, but may fail on complex sites.
 */
const simpleScrape = async (targetUrl: string): Promise<{ data: ScrapeResult | null, reason?: string }> => {
    try {
        const { result, error } = await ogs({
            url: targetUrl,
            timeout: 5000, // 5s timeout
        });

        if (error) {
            return { data: null, reason: 'OGS error' };
        }
        if (!result.success) {
            return { data: null, reason: 'OGS returned false success' };
        }

        // Check if we have enough meaningful data to succeed
        if (!result.ogTitle) {
            return { data: null, reason: 'Missing ogTitle' };
        }

        let image = '';
        if (result.ogImage && result.ogImage.length > 0) {
            image = result.ogImage[0].url;
        }

        const data: ScrapeResult = {
            title: result.ogTitle || '',
            description: result.ogDescription || '',
            image: image,
            favicon: result.favicon || '',
            scrapeStatus: 'success'
        };

        if (!data.image && !data.description) {
            return { data: null, reason: 'Missing image AND description' };
        }

        return { data };
    } catch (e: any) {
        let msg = (e instanceof Error) ? e.message : JSON.stringify(e);
        if (e && e.result && e.result.error) {
            msg = `OGS Error: ${e.result.error}`;
        }
        return { data: null, reason: `Exception: ${msg}` };
    }
};

/**
 * Advanced scraper using Puppeteer Stealth and Metascraper.
 */
// Singleton browser instance
let browserInstance: any = null;

const getBrowser = async () => {
    if (browserInstance) return browserInstance;

    logger.info('[Scraper] Launching new Puppeteer browser instance...');
    browserInstance = await puppeteer.launch({
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
    });

    // Handle disconnects to clear the singleton
    browserInstance.on('disconnected', () => {
        logger.info('[Scraper] Browser disconnected, clearing singleton.');
        browserInstance = null;
    });

    return browserInstance;
};

/**
 * Advanced scraper using Puppeteer Stealth and Metascraper.
 */
export const advancedScrape = async (targetUrl: string): Promise<ScrapeResult> => {
    let page: any;
    try {
        logger.info(`[Scraper] Starting Advanced Scrape (Puppeteer) for ${targetUrl}`);

        const browser = await getBrowser();
        page = await browser.newPage();

        // Enable request interception to block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            const resourceType = req.resourceType();
            // Block images, fonts, media, and stylesheets to save bandwidth/time
            // Note: We still parse HTML for og:image URL, we just don't download the binary.
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set a realistic viewport
        await page.setViewport({ width: 1280, height: 800 });

        // Go to page
        const response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded', // Much faster and more reliable
            timeout: 30000 // Reduced to 30s fail-fast
        });

        // Try to handle simple gates/overlays ("Enter", "I agree")
        try {
            // Short timeout for this check
            await page.waitForFunction(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                return buttons.some(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    return text.includes('enter') || text.includes('agree') || text.includes('yes, i am');
                });
            }, { timeout: 1000 }).then(async () => {
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    const enterButton = buttons.find(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        return text.includes('enter') || text.includes('agree') || text.includes('yes, ia am');
                    });
                    if (enterButton) (enterButton as HTMLElement).click();
                });
                await new Promise(r => setTimeout(r, 1000)); // Brief wait for settle
            }).catch(() => { }); // No button found, continue
        } catch (e) {
            // Ignore interaction errors
        }

        const status = response?.status();
        if (status === 403) {
            logger.warn(`[Scraper] Advanced Scrape BLOCKED (403) for ${targetUrl}`);
            await page.close();
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

        // Extract favicon manually from page if needed
        const favicon = await page.evaluate(() => {
            const icon = document.querySelector('link[rel="icon"]') ||
                document.querySelector('link[rel="shortcut icon"]');
            return (icon as HTMLLinkElement)?.href || '';
        });

        await page.close(); // Close only the page, keep browser alive

        logger.info(`[Scraper] Advanced Scrape SUCCESS for ${targetUrl}`);
        return {
            title: metadata.title || '',
            description: metadata.description || '',
            image: metadata.image || '',
            favicon: metadata.logo || metadata.favicon || favicon || '',
            scrapeStatus: 'success'
        };
    } catch (error: any) {
        logger.error(`[Scraper] Advanced Scrape FAILED for ${targetUrl}: ${error.message}`);
        if (page && !page.isClosed()) await page.close();
        // Do NOT close the browser instance here, reusing it for next requests.

        return {
            title: '',
            description: '',
            image: '',
            favicon: '',
            scrapeStatus: 'failed'
        };
    }
};

/**
 * Smart scraper that orchestrates between simple and advanced scraping.
 */
export const smartScrape = async (targetUrl: string): Promise<ScrapeResult> => {
    logger.info(`[Scraper] Starting Smart Scrape for: ${targetUrl}`);

    // 1. Try fast path
    const { data, reason } = await simpleScrape(targetUrl);

    // If we got a good result (at least a title and (image or description)), return it
    if (data) {
        logger.info(`[Scraper] Simple Scrape SUCCESS for: ${targetUrl}`);
        return data;
    }

    // 2. Fallback to heavy path
    logger.info(`[Scraper] Simple Scrape SKIPPED for: ${targetUrl}. Reason: ${reason || 'Unknown'}. Switching to Advanced Scrape.`);
    return advancedScrape(targetUrl);
};

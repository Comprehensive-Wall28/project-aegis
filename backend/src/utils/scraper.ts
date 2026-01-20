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
// Singleton browser instance management
let browserInstance: any = null;
let advancedScrapeCount = 0;
const MAX_ADVANCED_SCRAPES = 10; // Restart browser every 10 scrapes to reclaim memory
let idleTimeout: NodeJS.Timeout | null = null;
const IDLE_CLOSE_MS = 5 * 60 * 1000; // 5 minutes

// Concurrency control: Limit simultaneous advanced scrapes to save RAM but allow some parallelization
const MAX_CONCURRENT_SCRAPES = 2;
let activeAdvancedScrapes = 0;

const closeBrowser = async () => {
    if (browserInstance) {
        logger.info('[Scraper] Closing Puppeteer browser instance to reclaim memory...');
        try {
            await browserInstance.close();
        } catch (err: any) {
            logger.error(`[Scraper] Error closing browser: ${err.message}`);
        }
        browserInstance = null;
        advancedScrapeCount = 0;
    }
};

const getBrowser = async () => {
    // Reset idle timeout every time browser is requested
    if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
    }

    // Set a new idle timeout
    idleTimeout = setTimeout(() => {
        // Only close if no scrapes are active
        if (activeAdvancedScrapes === 0) {
            logger.info('[Scraper] Browser idle for 5 minutes, shutting down...');
            closeBrowser();
        } else {
            logger.info('[Scraper] Browser idle timeout reached but scrapes are active, postponing close.');
        }
    }, IDLE_CLOSE_MS);

    // If request limit reached, cycle the browser
    if (browserInstance && advancedScrapeCount >= MAX_ADVANCED_SCRAPES) {
        // Wait until all current scrapes finish before closing
        if (activeAdvancedScrapes === 0) {
            logger.info(`[Scraper] Request limit (${MAX_ADVANCED_SCRAPES}) reached. Recycling browser...`);
            await closeBrowser();
        }
    }

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
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-default-apps',
            '--mute-audio',
            '--disable-ipc-flooding-protection',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-features=AudioServiceOutOfProcess',
            '--disable-hang-monitor',
            '--disable-notifications',
            '--disable-offer-store-unmasked-wallet-cards',
            '--disable-popup-blocking',
            '--disable-print-preview',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-speech-api',
            '--disable-web-security',
            '--window-size=1280,800'
        ],
    });

    // Handle unexpected disconnects
    browserInstance.on('disconnected', () => {
        logger.info('[Scraper] Browser disconnected internally, clearing reference.');
        browserInstance = null;
        advancedScrapeCount = 0;
        activeAdvancedScrapes = 0;
    });

    return browserInstance;
};

/**
 * Advanced scraper using Puppeteer Stealth and Metascraper.
 */
export const advancedScrape = async (targetUrl: string): Promise<ScrapeResult> => {
    // Concurrency Gate: Wait for a slot if max concurrent scrapes reached
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2s = 60s total wait time
    while (activeAdvancedScrapes >= MAX_CONCURRENT_SCRAPES && attempts < maxAttempts) {
        attempts++;
        if (attempts % 5 === 0) {
            logger.info(`[Scraper] Advanced scrape waiting for slot (${activeAdvancedScrapes} active, attempt ${attempts})...`);
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    if (activeAdvancedScrapes >= MAX_CONCURRENT_SCRAPES) {
        logger.error(`[Scraper] Too many concurrent scrapes, failing for ${targetUrl}`);
        return { title: '', description: '', image: '', favicon: '', scrapeStatus: 'failed' };
    }

    activeAdvancedScrapes++;
    advancedScrapeCount++;

    let context: any;
    let page: any;

    try {
        logger.info(`[Scraper] Starting Advanced Scrape (Puppeteer) [Req #${advancedScrapeCount}] for ${targetUrl}`);

        const browser = await getBrowser();

        // Use a fresh Browser Context for session isolation and easier memory cleanup
        context = await browser.createBrowserContext();
        page = await context.newPage();

        // Enable request interception to block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            const resourceType = req.resourceType();
            // Block images, fonts, media, and stylesheets to save bandwidth/time
            if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set a realistic viewport
        await page.setViewport({ width: 1280, height: 800 });

        // Go to page
        const response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000 // Increased timeout for slow sites
        });

        const status = response?.status();
        if (status === 403) {
            logger.warn(`[Scraper] Advanced Scrape BLOCKED (403) for ${targetUrl}`);
            return { title: '', description: '', image: '', favicon: '', scrapeStatus: 'blocked' };
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
        return { title: '', description: '', image: '', favicon: '', scrapeStatus: 'failed' };
    } finally {
        activeAdvancedScrapes--;
        // Ensure context and all its pages are closed
        if (context) {
            try {
                await context.close();
            } catch (err: any) {
                logger.error(`[Scraper] Error closing browser context: ${err.message}`);
            }
        }
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


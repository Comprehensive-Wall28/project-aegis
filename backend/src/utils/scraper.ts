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
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import PQueue from 'p-queue';
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

// =============================================================================
// ASYNC QUEUE FOR SCRAPER CONCURRENCY
// =============================================================================
// Using p-queue for proper async concurrency control instead of busy-wait polling.
// This is more efficient and doesn't block the event loop.

const SCRAPE_QUEUE_CONCURRENCY = 2; // Max simultaneous Puppeteer scrapes
const SCRAPE_QUEUE_TIMEOUT = 60000; // 60 second timeout per queued task

const scrapeQueue = new PQueue({
    concurrency: SCRAPE_QUEUE_CONCURRENCY,
});

// Log queue stats periodically when there's activity
scrapeQueue.on('active', () => {
    logger.debug(`[ScrapeQueue] Task started. Queue size: ${scrapeQueue.size}, Pending: ${scrapeQueue.pending}`);
});

scrapeQueue.on('idle', () => {
    logger.debug('[ScrapeQueue] Queue is now idle.');
});

scrapeQueue.on('error', (error) => {
    logger.error(`[ScrapeQueue] Task error: ${error.message}`);
});

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
const MAX_ADVANCED_SCRAPES = 5; // Reduced for 2GB RAM environments - recycle browser more frequently
let idleTimeout: NodeJS.Timeout | null = null;
const IDLE_CLOSE_MS = 3 * 60 * 1000; // 3 minutes (reduced from 5 for memory)

// Note: Concurrency is now managed by scrapeQueue (p-queue)

/**
 * Check if a URL belongs to a blocked domain (trackers, analytics, ads).
 * Blocking these reduces bandwidth and speeds up page loads.
 */
const BLOCKED_DOMAIN_PATTERNS = [
    /google-analytics\.com/i,
    /googletagmanager\.com/i,
    /googlesyndication\.com/i,
    /doubleclick\.net/i,
    /facebook\.net/i,
    /facebook\.com\/tr/i,
    /connect\.facebook/i,
    /analytics\./i,
    /hotjar\.com/i,
    /clarity\.ms/i,
    /segment\.io/i,
    /segment\.com/i,
    /mixpanel\.com/i,
    /amplitude\.com/i,
    /newrelic\.com/i,
    /sentry\.io/i,
    /bugsnag\.com/i,
    /cdn\.mxpnl\.com/i,
    /stats\./i,
    /pixel\./i,
    /beacon\./i,
    /tracking\./i,
    /adservice\./i,
    /adsystem\./i,
    /pubads\./i,
];

function isBlockedDomain(url: string): boolean {
    return BLOCKED_DOMAIN_PATTERNS.some(pattern => pattern.test(url));
}

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
        // Only close if no scrapes are active (check queue pending count)
        if (scrapeQueue.pending === 0) {
            logger.info('[Scraper] Browser idle for 5 minutes, shutting down...');
            closeBrowser();
        } else {
            logger.info('[Scraper] Browser idle timeout reached but scrapes are active, postponing close.');
        }
    }, IDLE_CLOSE_MS);

    // If request limit reached, cycle the browser
    if (browserInstance && advancedScrapeCount >= MAX_ADVANCED_SCRAPES) {
        // Wait until all current scrapes finish before closing (check queue pending count)
        if (scrapeQueue.pending === 0) {
            logger.info(`[Scraper] Request limit (${MAX_ADVANCED_SCRAPES}) reached. Recycling browser...`);
            await closeBrowser();
        }
    }

    if (browserInstance) return browserInstance;

    logger.info('[Scraper] Launching new Puppeteer browser instance...');
    browserInstance = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
            '--disable-features=AudioServiceOutOfProcess,TranslateUI',
            '--disable-hang-monitor',
            '--disable-notifications',
            '--disable-offer-store-unmasked-wallet-cards',
            '--disable-popup-blocking',
            '--disable-print-preview',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-speech-api',
            '--disable-web-security',
            '--js-flags=--max-old-space-size=256', // Limit V8 heap to 256MB
            '--window-size=800,600' // Smaller viewport = less rendering work
        ],
    });

    // Handle unexpected disconnects
    browserInstance.on('disconnected', () => {
        logger.info('[Scraper] Browser disconnected internally, clearing reference.');
        browserInstance = null;
        advancedScrapeCount = 0;
    });

    return browserInstance;
};

/**
 * Internal implementation of advanced scraping (runs inside the queue).
 */
const advancedScrapeInternal = async (targetUrl: string): Promise<ScrapeResult> => {
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
            const url = req.url();

            // Block images, fonts, media, stylesheets, and tracking/analytics
            if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
                req.abort();
            } else if (isBlockedDomain(url)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Smaller viewport = less rendering work (optimized for 1CPU)
        await page.setViewport({ width: 800, height: 600 });

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
 * Advanced scraper using Puppeteer Stealth and Metascraper.
 * Uses p-queue for proper async concurrency control.
 */
export const advancedScrape = async (targetUrl: string): Promise<ScrapeResult> => {
    try {
        // Queue the scrape task with a timeout
        const result = await scrapeQueue.add(
            () => advancedScrapeInternal(targetUrl),
            { timeout: SCRAPE_QUEUE_TIMEOUT }
        );
        return result ?? { title: '', description: '', image: '', favicon: '', scrapeStatus: 'failed' };
    } catch (error: any) {
        // Handle timeout or other queue errors
        if (error.name === 'TimeoutError') {
            logger.error(`[Scraper] Advanced scrape TIMED OUT in queue for ${targetUrl}`);
        } else {
            logger.error(`[Scraper] Advanced scrape queue error for ${targetUrl}: ${error.message}`);
        }
        return { title: '', description: '', image: '', favicon: '', scrapeStatus: 'failed' };
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

// =============================================================================
// READER MODE SCRAPER
// =============================================================================

export interface ReaderContentResult {
    title: string;
    byline: string | null;
    content: string; // Cleaned HTML content
    textContent: string; // Plain text version
    siteName: string | null;
    status: 'success' | 'blocked' | 'failed';
    error?: string;
}

/**
 * Internal implementation of reader scraping (runs inside the queue).
 */
const readerScrapeInternal = async (targetUrl: string): Promise<ReaderContentResult> => {
    advancedScrapeCount++;
    let context: any;
    let page: any;

    try {
        logger.info(`[ReaderScrape] Starting Reader Scrape [Req #${advancedScrapeCount}] for ${targetUrl}`);

        const browser = await getBrowser();
        context = await browser.createBrowserContext();
        page = await context.newPage();

        // Enable request interception - but for reader mode, we need images
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            const resourceType = req.resourceType();
            const url = req.url();

            // Block fonts, media, stylesheets, and tracking/analytics, but KEEP images for reader
            if (['stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
                req.abort();
            } else if (isBlockedDomain(url)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Smaller viewport = less rendering work (optimized for 1CPU)
        await page.setViewport({ width: 800, height: 600 });

        const response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        const status = response?.status();
        if (status === 403) {
            logger.warn(`[ReaderScrape] BLOCKED (403) for ${targetUrl}`);
            return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'blocked', error: 'Access blocked by website' };
        }

        const html = await page.content();
        const finalUrl = page.url();

        // IMPORTANT: Extract download links BEFORE Readability strips them
        const downloadLinksHtml = extractDownloadLinks(html, finalUrl);

        // Parse with JSDOM and Readability
        const dom = new JSDOM(html, { url: finalUrl });
        const reader = new Readability(dom.window.document, {
            // Keep certain elements that Readability might remove
            keepClasses: true,
        });

        const article = reader.parse();

        if (!article || !article.content) {
            logger.warn(`[ReaderScrape] No readable content found for ${targetUrl}`);
            return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: 'No readable content found' };
        }

        // Post-process the content to:
        // 1. Add paragraph IDs for annotation targeting
        // 2. Ensure download links are preserved
        let processedContent = processReaderContent(article.content, finalUrl);

        // Append extracted download links if any were found
        if (downloadLinksHtml) {
            processedContent += downloadLinksHtml;
        }

        logger.info(`[ReaderScrape] SUCCESS for ${targetUrl} - Title: ${article.title}`);
        return {
            title: article.title || '',
            byline: article.byline || null,
            content: processedContent,
            textContent: article.textContent || '',
            siteName: article.siteName || null,
            status: 'success'
        };
    } catch (error: any) {
        logger.error(`[ReaderScrape] FAILED for ${targetUrl}: ${error.message}`);
        return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: error.message };
    } finally {
        if (context) {
            try {
                await context.close();
            } catch (err: any) {
                logger.error(`[ReaderScrape] Error closing browser context: ${err.message}`);
            }
        }
    }
};

/**
 * Scrapes a URL and extracts readable article content using Mozilla Readability.
 * Preserves download links and buttons while stripping ads and clutter.
 * Uses p-queue for proper async concurrency control.
 */
export const readerScrape = async (targetUrl: string): Promise<ReaderContentResult> => {
    try {
        // Queue the scrape task with a timeout
        const result = await scrapeQueue.add(
            () => readerScrapeInternal(targetUrl),
            { timeout: SCRAPE_QUEUE_TIMEOUT }
        );
        return result ?? { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: 'Queue returned undefined' };
    } catch (error: any) {
        // Handle timeout or other queue errors
        if (error.name === 'TimeoutError') {
            logger.error(`[ReaderScrape] TIMED OUT in queue for ${targetUrl}`);
        } else {
            logger.error(`[ReaderScrape] Queue error for ${targetUrl}: ${error.message}`);
        }
        return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: error.message || 'Queue timeout' };
    }
};

/**
 * Process reader content to add paragraph IDs and ensure proper link handling.
 */
function processReaderContent(htmlContent: string, baseUrl: string): string {
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;

    // Add unique IDs to paragraphs for annotation targeting
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach((p, index) => {
        if (!p.id) {
            // Create a stable ID based on position and content hash
            const textSnippet = (p.textContent || '').slice(0, 50).replace(/\s+/g, '_');
            p.id = `aegis-p-${index}-${hashString(textSnippet)}`;
        }
        // Add data attribute for annotation discovery
        p.setAttribute('data-aegis-paragraph', 'true');
    });

    // Ensure all links have proper href and target attributes
    const links = doc.querySelectorAll('a');
    links.forEach((a) => {
        const href = a.getAttribute('href');
        if (href) {
            // Make relative URLs absolute
            if (href.startsWith('/') || (!href.startsWith('http') && !href.startsWith('mailto:'))) {
                try {
                    const absoluteUrl = new URL(href, baseUrl).href;
                    a.setAttribute('href', absoluteUrl);
                } catch {
                    // Keep original if URL parsing fails
                }
            }
            // Mark download links for preservation
            if (isDownloadLink(href, a.textContent || '')) {
                a.setAttribute('data-aegis-download', 'true');
            }
        }
        // Open all links in new tab
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
    });

    // Add IDs to headings for structure
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((h, index) => {
        if (!h.id) {
            const text = (h.textContent || '').slice(0, 30).replace(/\s+/g, '-').toLowerCase();
            h.id = `heading-${index}-${text}`;
        }
    });

    return doc.body.innerHTML;
}

/**
 * Simple hash function for creating stable paragraph IDs.
 */
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).slice(0, 8);
}

/**
 * Detect if a link is likely a download link based on href and text.
 */
function isDownloadLink(href: string, text: string): boolean {
    // File extension patterns
    const filePatterns = [
        /\.pdf$/i, /\.zip$/i, /\.rar$/i, /\.7z$/i,
        /\.doc[x]?$/i, /\.xls[x]?$/i, /\.ppt[x]?$/i,
        /\.mp3$/i, /\.mp4$/i, /\.mov$/i, /\.avi$/i, /\.mkv$/i,
        /\.exe$/i, /\.dmg$/i, /\.pkg$/i, /\.apk$/i, /\.iso$/i
    ];

    // Cloud hosting service patterns
    const hostingPatterns = [
        /mega\.nz/i, /mega\.co\.nz/i,
        /terabox/i, /teraboxapp/i,
        /onedrive\.live/i, /1drv\.ms/i,
        /drive\.google/i,
        /dropbox\.com/i,
        /mediafire\.com/i,
        /zippyshare/i,
        /uploadhaven/i,
        /pixeldrain/i,
        /gofile\.io/i,
        /anonfiles/i,
        /bayfiles/i,
        /krakenfiles/i,
        /workupload/i,
        /filehost/i,
        /uploadfiles/i,
        /adshrink/i,
        /ouo\.(?:io|press)/i,
        /doodrive/i,
        /pixeldrain/i,
        /linkvertise/i,
        /shrinkme/i
    ];

    // Text content patterns
    const textPatterns = [
        /download/i, /get\s+(?:it|now|here)/i, /\bfree\b.*\bdownload\b/i,
        /mega/i, /gdrive/i, /google\s*drive/i, /onedrive/i, /terabox/i,
        /mediafire/i, /dropbox/i, /\blink\b/i, /doodrive/i, /pixel/i,
        /mirrored/i, /zippyshare/i, /ouo/i, /adshrink/i
    ];

    // Check URL against file and hosting patterns
    if (filePatterns.some(p => p.test(href)) || hostingPatterns.some(p => p.test(href))) {
        return true;
    }

    // Check text content
    if (textPatterns.some(p => p.test(text))) {
        return true;
    }

    return false;
}

/**
 * Extract download links from raw HTML before Readability strips them.
 * Returns HTML section with download links to append to content.
 */
function extractDownloadLinks(html: string, baseUrl: string): string {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const links = doc.querySelectorAll('a');
    const downloadLinks: { href: string; text: string }[] = [];

    links.forEach((a) => {
        const href = a.getAttribute('href');
        const text = (a.textContent || '').trim();

        if (href && text && isDownloadLink(href, text)) {
            // Make relative URLs absolute
            let absoluteHref = href;
            if (href.startsWith('/') || (!href.startsWith('http') && !href.startsWith('mailto:'))) {
                try {
                    absoluteHref = new URL(href, baseUrl).href;
                } catch {
                    // Keep original
                }
            }
            // Avoid duplicates
            if (!downloadLinks.some(l => l.href === absoluteHref)) {
                downloadLinks.push({ href: absoluteHref, text });
            }
        }
    });

    if (downloadLinks.length === 0) {
        return '';
    }

    // Build styled download section
    const linksHtml = downloadLinks.map(({ href, text }) =>
        `<a href="${href}" target="_blank" rel="noopener noreferrer" data-aegis-download="true">${text}</a>`
    ).join(' | ');

    // Look for password in the document
    let passwordLine = '';
    const bodyText = doc.body.textContent || '';
    const passwordMatch = bodyText.match(/Password\s*:\s*([^\n\s]+)/i);
    if (passwordMatch) {
        passwordLine = `<p style="margin-top: 12px; font-family: monospace; background: #333; padding: 8px; border-radius: 4px;">Password: ${passwordMatch[1]}</p>`;
    }

    return `
        <div style="margin-top: 32px; padding: 20px; border: 2px solid #666; border-radius: 12px; background-color: rgba(255,255,255,0.05);">
            <p style="font-weight: bold; margin-bottom: 12px; font-size: 1.1em;">📥 Download Links</p>
            <p>${linksHtml}</p>
            ${passwordLine}
        </div>
    `;
}

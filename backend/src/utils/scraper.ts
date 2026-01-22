import { chromium, Browser, BrowserContext, Page } from 'playwright';
const { chromium: chromiumStealth } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromiumStealth.use(stealth);

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
import PQueue from 'p-queue';
import fs from 'fs';
import path from 'path';
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

// Setup Puppeteer Stealth is removed in favor of Playwright Stealth

// =============================================================================
// ASYNC QUEUE FOR SCRAPER CONCURRENCY
// =============================================================================
// Using p-queue for proper async concurrency control instead of busy-wait polling.
// This is more efficient and doesn't block the event loop.

const SCRAPE_QUEUE_CONCURRENCY = 4; // Maximized for 2GB RAM environment with Playwright
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
 * Advanced scraper using Playwright and In-Browser Extraction.
 */
// Singleton browser instance management
let browserInstance: Browser | null = null;
let advancedScrapeCount = 0;
const MAX_ADVANCED_SCRAPES = 20; // Increased as Playwright is more stable
let idleTimeout: NodeJS.Timeout | null = null;
const IDLE_CLOSE_MS = 5 * 60 * 1000; // 5 minutes

// Note: Concurrency is now managed by scrapeQueue (p-queue)

/**
 * Check if a URL belongs to a blocked domain (trackers, analytics, ads).
 * Blocking these reduces bandwidth and speeds up page loads.
 */
const BLOCKED_DOMAIN_PATTERNS = [
    // Social & Trackers
    'googletagmanager.com', 'google-analytics.com', 'facebook.net', 'connect.facebook.net',
    'twitter.com', 'platform.twitter.com', 'linkedin.com', 'bing.com', 'yandex.ru',
    'doubleclick.net', 'adnxs.com', 'adsystem.com', 'adrolling.com', 'hotjar.com',
    'segment.io', 'amplitude.com', 'mixpanel.com', 'sentry.io', 'intercom.io',
    // Ads & Widgets
    'disqus.com', 'disquscdn.com', 'gravatar.com', 'fontawesome.com', 'typekit.net',
    'googlesyndication.com', 'taboola.com', 'outbrain.com', 'criteo.com',
    'amazon-adsystem.com', 'adnxs.com', 'scorecardresearch.com'
];

function isBlockedDomain(url: string): boolean {
    return BLOCKED_DOMAIN_PATTERNS.some(pattern => url.includes(pattern));
}

const closeBrowser = async () => {
    if (browserInstance) {
        logger.info('[Scraper] Closing Playwright browser instance...');
        try {
            await browserInstance.close();
        } catch (err: any) {
            logger.error(`[Scraper] Error closing browser: ${err.message}`);
        }
        browserInstance = null;
        advancedScrapeCount = 0;
    }
};

const getBrowser = async (): Promise<Browser> => {
    if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
    }

    idleTimeout = setTimeout(() => {
        if (scrapeQueue.pending === 0) {
            logger.info('[Scraper] Browser idle timeout reached, shutting down...');
            closeBrowser();
        }
    }, IDLE_CLOSE_MS);

    if (browserInstance && advancedScrapeCount >= MAX_ADVANCED_SCRAPES) {
        if (scrapeQueue.pending === 0) {
            logger.info(`[Scraper] Request limit (${MAX_ADVANCED_SCRAPES}) reached. Recycling browser...`);
            await closeBrowser();
        }
    }

    if (browserInstance) return browserInstance;

    logger.info('[Scraper] Launching new Playwright browser instance...');

    // In Docker, we use the playwright-installed chromium.
    // Locally (if playwright is missing), this might fail, but deployment is prioritized.
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const launchOptions: any = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--no-zygote',
            '--js-flags=--max-old-space-size=512',
        ],
    };

    // Only set executablePath if it explicitly exists to avoid Playwright launch errors
    if (executablePath && fs.existsSync(executablePath)) {
        launchOptions.executablePath = executablePath;
    }

    browserInstance = await chromiumStealth.launch(launchOptions);

    browserInstance?.on('disconnected', () => {
        logger.info('[Scraper] Browser disconnected.');
        browserInstance = null;
        advancedScrapeCount = 0;
    });

    return browserInstance!;
};

// Load Readability script content once to inject it
let readabilityScript = '';
try {
    const readabilityPath = path.resolve(__dirname, '../../node_modules/@mozilla/readability/Readability.js');
    readabilityScript = fs.readFileSync(readabilityPath, 'utf8');
} catch (err) {
    logger.error(`[Scraper] Failed to load Readability script: ${err}`);
}

/**
 * Internal implementation of advanced scraping using Playwright.
 */
const advancedScrapeInternal = async (targetUrl: string): Promise<ScrapeResult> => {
    advancedScrapeCount++;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
        logger.info(`[Scraper] Starting Advanced Scrape (Playwright) [Req #${advancedScrapeCount}] for ${targetUrl}`);
        const browser = await getBrowser();
        context = await browser.newContext({
            viewport: { width: 800, height: 600 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            bypassCSP: true,
            serviceWorkers: 'block',
            permissions: [],
        });
        page = await context.newPage();

        // Block unnecessary resources
        await page.route('**/*', (route: any) => {
            const request = route.request();
            const type = request.resourceType();
            const url = request.url();

            if (['image', 'media', 'font', 'stylesheet'].includes(type) || isBlockedDomain(url)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        const response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000 // Fast fail for metadata
        });

        if (response?.status() === 403) {
            return { title: '', description: '', image: '', favicon: '', scrapeStatus: 'blocked' };
        }

        // Optimization: Instead of transferring the whole HTML (which can be MBs),
        // we extract only the relevant meta tags and basic structure in-browser.
        const pageData = await page.evaluate(() => {
            const meta: Record<string, string> = {};
            document.querySelectorAll('meta').forEach(el => {
                const name = el.getAttribute('name') || el.getAttribute('property') || el.getAttribute('itemprop');
                const content = el.getAttribute('content');
                if (name && content) meta[name.toLowerCase()] = content;
            });

            const favicon = (document.querySelector('link[rel="icon"]') as HTMLLinkElement)?.href ||
                (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement)?.href || '';

            return {
                html: `<head><title>${document.title}</title>` +
                    Array.from(document.querySelectorAll('meta')).map(m => m.outerHTML).join('') +
                    '</head>',
                url: window.location.href,
                favicon
            };
        });

        // Metascraper only needs the head/meta tags for 99% of its work
        const metadata = await metascraper({ html: pageData.html, url: pageData.url });

        logger.info(`[Scraper] Advanced Scrape SUCCESS for ${targetUrl}`);
        return {
            title: metadata.title || '',
            description: metadata.description || '',
            image: metadata.image || '',
            favicon: metadata.logo || metadata.favicon || pageData.favicon || '',
            scrapeStatus: 'success'
        };
    } catch (error: any) {
        logger.error(`[Scraper] Advanced Scrape FAILED for ${targetUrl}: ${error.message}`);
        return { title: '', description: '', image: '', favicon: '', scrapeStatus: 'failed' };
    } finally {
        if (context) await context.close();
    }
};

/**
 * Advanced scraper using Playwright Stealth and Metascraper.
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
 * Internal implementation of reader scraping using Playwright + In-Browser Readability.
 */
const readerScrapeInternal = async (targetUrl: string): Promise<ReaderContentResult> => {
    advancedScrapeCount++;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
        logger.info(`[ReaderScrape] Starting Reader Scrape (Playwright) [Req #${advancedScrapeCount}] for ${targetUrl}`);
        const browser = await getBrowser();
        context = await browser.newContext({
            viewport: { width: 1024, height: 768 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            bypassCSP: true,
            serviceWorkers: 'block',
            permissions: [],
        });
        page = await context.newPage();

        // 1. Pre-inject Readability so it's ready as soon as DOM is available
        await page.addInitScript({ content: readabilityScript });

        // Block unnecessary resources but keep images for reader mode
        await page.route('**/*', (route: any) => {
            const request = route.request();
            const type = request.resourceType();
            const url = request.url();

            if (['media', 'font', 'stylesheet'].includes(type) || isBlockedDomain(url)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        const response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        if (response?.status() === 403) {
            return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'blocked', error: 'Access blocked (403)' };
        }

        // 2. Smart Wait: Look for signs of "real content" rendered by JS
        try {
            await page.waitForFunction(() => {
                // Heuristic for content availability
                const article = document.querySelector('article, .article, .post, .content, main');
                const pCount = document.querySelectorAll('p').length;
                const bodyText = document.body?.innerText || '';

                // If we have an article tag or many paragraphs, it's likely ready
                if (article || pCount > 10) return true;
                // Fallback for smaller pages
                return bodyText.length > 800 && !bodyText.includes('Loading...');
            }, { timeout: 2000 }).catch(() => { });
        } catch (e) { }

        // 3. Extraction + Processing in Browser
        const result = await page.evaluate(({ baseUrl }) => {
            // @ts-ignore
            if (typeof Readability === 'undefined') {
                return { error: 'Readability script not found in browser context' };
            }

            // A. Helper for download links
            const isDownloadLink = (href: string, text: string) => {
                const patterns = [
                    /\.(zip|7z|rar|iso|exe|dmg|pkg|apk|pdf)$/i,
                    /mega\.nz|mediafire\.com|terabox|drive\.google|pixeldrain|doodrive|gdrive|1drv\.ms|dropbox\.com/i,
                    /zippyshare|krakenfiles|workupload|gofile\.io|anonfiles|bayfiles/i,
                ];
                const textPatterns = [
                    /download/i, /get\s+(?:it|now|here)/i, /mega/i, /gdrive/i, /google\s*drive/i, /pixel/i,
                    /mirrored/i, /zippyshare/i, /doodrive/i, /terabox/i
                ];
                return patterns.some(p => p.test(href)) || textPatterns.some(p => p.test(text));
            };

            // B. Run Readability
            // @ts-ignore
            const docClone = document.cloneNode(true);
            // @ts-ignore
            const reader = new Readability(docClone, { keepClasses: true });
            const article = reader.parse();
            if (!article || !article.title) return null;

            // C. Post-process extracted content
            const container = document.createElement('div');
            container.innerHTML = article.content;

            // Add paragraph IDs for targeting
            const paragraphs = container.querySelectorAll('p');
            paragraphs.forEach((p, idx) => {
                if (!p.id) {
                    const text = (p.textContent || '').slice(0, 30).replace(/\s+/g, '_');
                    p.id = `aegis-p-${idx}`;
                }
                p.setAttribute('data-aegis-paragraph', 'true');
            });

            // Fix link targets and relative URLs
            const links = container.querySelectorAll('a');
            links.forEach(a => {
                const href = a.getAttribute('href');
                if (href) {
                    try {
                        const absUrl = new URL(href, baseUrl).href;
                        a.setAttribute('href', absUrl);
                        if (isDownloadLink(absUrl, a.textContent || '')) {
                            a.setAttribute('data-aegis-download', 'true');
                        }
                    } catch (e) { }
                }
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            });

            // D. Extract Download Links from the FULL page (not just article)
            const allLinks = Array.from(document.querySelectorAll('a'));
            const downloadLinks = allLinks
                .filter(a => isDownloadLink(a.href, a.textContent || ''))
                .map(a => ({
                    href: a.href,
                    text: (a.textContent || '').trim().replace(/^[|\s\-_/]+/, '').toUpperCase()
                }))
                .filter(l => l.text.length > 0 && l.text.length < 100)
                .slice(0, 25);

            // E. Search for password
            const passwordMatch = document.body.innerText.match(/Password\s*[:]\s*([^\n\s]+)/i);

            return {
                article: {
                    ...article,
                    content: container.innerHTML
                },
                downloadLinks,
                password: passwordMatch ? passwordMatch[1] : null
            };
        }, { baseUrl: targetUrl });

        if (!result || !('article' in result) || !result.article) {
            const errorMsg = (result && 'error' in result) ? result.error : 'No readable content';
            return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: errorMsg as string };
        }

        const { article, downloadLinks = [], password = null } = result;
        let processedContent = article.content;

        // Append download section if links found
        if (downloadLinks.length > 0) {
            const linksHtml = downloadLinks.map(l =>
                `<a href="${l.href}" target="_blank" rel="noopener noreferrer" data-aegis-download="true">${l.text}</a>`
            ).join('');

            const passwordHtml = password ?
                `<div class="aegis-password-container"><span class="password-label">Password:</span><code class="password-value">${password}</code></div>` : '';

            processedContent += `
                <div class="aegis-download-section">
                    <div class="aegis-download-header"><h3>Download Links</h3></div>
                    <div class="aegis-download-grid">${linksHtml}</div>
                    ${passwordHtml}
                </div>`;
        }

        logger.info(`[ReaderScrape] SUCCESS for ${targetUrl}`);
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
        if (context) await context.close();
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


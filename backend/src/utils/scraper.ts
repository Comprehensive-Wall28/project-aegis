import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { applyStealthScripts } from './stealth';

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
import { USER_AGENTS } from './userAgents';
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
let browserLaunchPromise: Promise<Browser> | null = null;

// Note: Concurrency is now managed by scrapeQueue (p-queue)

const LOCALES = ['en-US', 'en-GB', 'en-CA', 'fr-FR', 'de-DE', 'es-ES'];
const TIMEZONES = ['America/New_York', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo'];

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomViewport() {
    const widths = [1280, 1366, 1440, 1536, 1600, 1920];
    const heights = [720, 768, 864, 900, 1024, 1080];
    return {
        width: getRandomItem(widths) + Math.floor(Math.random() * 50),
        height: getRandomItem(heights) + Math.floor(Math.random() * 50)
    };
}

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
            logger.info('[Scraper:Internal] Browser idle timeout reached, shutting down...');
            closeBrowser();
        }
    }, IDLE_CLOSE_MS);

    if (browserInstance && advancedScrapeCount >= MAX_ADVANCED_SCRAPES) {
        if (scrapeQueue.pending === 0) {
            logger.info(`[Scraper:Internal] Request limit (${MAX_ADVANCED_SCRAPES}) reached. Recycling browser...`);
            await closeBrowser();
        }
    }

    if (browserInstance) return browserInstance;
    if (browserLaunchPromise) return browserLaunchPromise;

    logger.info('[Scraper:Internal] Launching new Playwright browser instance...');

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
            '--disable-blink-features=AutomationControlled',
        ],
    };

    if (executablePath) {
        try {
            await fs.promises.access(executablePath);
            launchOptions.executablePath = executablePath;
        } catch (_err) {
            // Path doesn't exist or isn't accessible, use default
        }
    }

    browserLaunchPromise = chromium.launch(launchOptions).then((browser: Browser) => {
        browserInstance = browser;
        browserLaunchPromise = null;

        browserInstance.on('disconnected', () => {
            logger.info('[Scraper:Internal] Browser disconnected.');
            browserInstance = null;
            advancedScrapeCount = 0;
            browserLaunchPromise = null;
        });

        return browser;
    }).catch((err: any) => {
        browserLaunchPromise = null;
        throw err;
    });

    return browserLaunchPromise!;
};

// Load Readability script content once to inject it
let readabilityScript = '';
let readabilityLoadingPromise: Promise<string> | null = null;

const loadReadabilityScript = async (): Promise<string> => {
    if (readabilityScript) return readabilityScript;
    if (readabilityLoadingPromise) return readabilityLoadingPromise;

    readabilityLoadingPromise = (async () => {
        try {
            const readabilityPath = path.resolve(__dirname, '../../node_modules/@mozilla/readability/Readability.js');
            const content = await fs.promises.readFile(readabilityPath, 'utf8');
            readabilityScript = content;
            return content;
        } catch (err) {
            logger.error(`[Scraper] Failed to load Readability script: ${err}`);
            readabilityLoadingPromise = null;
            return '';
        }
    })();

    return readabilityLoadingPromise;
};

// Initial trigger to load it async
loadReadabilityScript();

/**
 * Internal implementation of advanced scraping using Playwright.
 */
const advancedScrapeInternal = async (targetUrl: string): Promise<ScrapeResult> => {
    advancedScrapeCount++;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
        const reqId = advancedScrapeCount;
        logger.info(`[Scraper:Advanced] Starting scrape [Req #${reqId}] for ${targetUrl}`);
        const browser = await getBrowser();
        const viewport = getRandomViewport();
        context = await browser.newContext({
            viewport,
            userAgent: getRandomItem(USER_AGENTS),
            locale: getRandomItem(LOCALES),
            timezoneId: getRandomItem(TIMEZONES),
            bypassCSP: true,
            serviceWorkers: 'block',
            permissions: [],
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Upgrade-Insecure-Requests': '1',
            }
        });
        page = await context.newPage();
        await applyStealthScripts(page);
        await context.addInitScript("window.__name = (f) => f;");

        // Block unnecessary resources but allow some small images from same domain for stealth
        await page.route('**/*', (route: any) => {
            const request = route.request();
            const type = request.resourceType();
            const url = request.url();

            if (['media', 'font', 'stylesheet'].includes(type) || isBlockedDomain(url)) {
                route.abort();
            } else if (type === 'image') {
                // Heuristic: only block large images or images from different domains
                const isExternal = !url.includes(new URL(targetUrl).hostname);
                if (isExternal) {
                    route.abort();
                } else {
                    route.continue();
                }
            } else {
                route.continue();
            }
        });

        let response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000 // Fast fail for metadata
        });

        // Handle WAF Challenge Pages (Sucuri, Cloudflare, etc.)
        const wafBypassed = await handleWafChallenge(page);
        if (wafBypassed) {
            logger.info(`[Scraper] WAF challenge bypassed for ${targetUrl}`);
        }

        if (response?.status() === 403) {
            // Double check if we're still on a challenge page after attempted bypass
            const isStillBlocked = await page.evaluate(function () {
                const bodyText = document.body?.innerText || '';
                return bodyText.includes('Access Denied') ||
                    bodyText.includes('Website Firewall');
            });
            if (isStillBlocked) {
                logger.warn(`[Scraper:Advanced] Blocked by WAF after bypass attempt for ${targetUrl}`);
                return { title: '', description: '', image: '', favicon: '', scrapeStatus: 'blocked' };
            }
        }

        // Optimization: Instead of transferring the whole HTML (which can be MBs),
        // we extract only the relevant meta tags and basic structure in-browser.
        const pageData = await page.evaluate(function () {
            const meta: Record<string, string> = {};
            document.querySelectorAll('meta').forEach(function (el) {
                const name = el.getAttribute('name') || el.getAttribute('property') || el.getAttribute('itemprop');
                const content = el.getAttribute('content');
                if (name && content) meta[name.toLowerCase()] = content;
            });

            const favicon = (document.querySelector('link[rel="icon"]') as HTMLLinkElement)?.href ||
                (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement)?.href || '';

            return {
                html: `<head><title>${document.title}</title>` +
                    Array.from(document.querySelectorAll('meta')).map(function (m) { return m.outerHTML; }).join('') +
                    '</head>',
                url: window.location.href,
                favicon
            };
        });

        // Metascraper only needs the head/meta tags for 99% of its work
        const metadata = await metascraper({ html: pageData.html, url: pageData.url });

        logger.info(`[Scraper:Advanced] SUCCESS [Req #${reqId}] for ${targetUrl}`);
        return {
            title: metadata.title || '',
            description: metadata.description || '',
            image: metadata.image || '',
            favicon: metadata.logo || metadata.favicon || pageData.favicon || '',
            scrapeStatus: 'success'
        };
    } catch (error: any) {
        logger.error(`[Scraper:Advanced] FAILED for ${targetUrl}: ${error.message}`);
        return { title: '', description: '', image: '', favicon: '', scrapeStatus: 'failed' };
    } finally {
        if (context) await context.close();
    }
};

/**
 * Advanced scraper using Playwright Stealth and Metascraper.
 * Uses p-queue for proper async concurrency control with retries.
 */
export const advancedScrape = async (targetUrl: string, retryCount = 0): Promise<ScrapeResult> => {
    const MAX_RETRIES = 2;
    try {
        // Queue the scrape task with a timeout
        const result = await scrapeQueue.add(
            () => advancedScrapeInternal(targetUrl),
            { timeout: SCRAPE_QUEUE_TIMEOUT }
        );

        if (result?.scrapeStatus === 'blocked' && retryCount < MAX_RETRIES) {
            const delay = (retryCount + 1) * 5000;
            logger.warn(`[Scraper:Advanced] BLOCKED [Req #${advancedScrapeCount}]. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES}) for ${targetUrl}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return advancedScrape(targetUrl, retryCount + 1);
        }

        return result ?? { title: '', description: '', image: '', favicon: '', scrapeStatus: 'failed' };
    } catch (error: any) {
        // Handle timeout or other queue errors
        if (error.name === 'TimeoutError' && retryCount < MAX_RETRIES) {
            logger.warn(`[Scraper] Advanced scrape TIMED OUT for ${targetUrl}. Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            return advancedScrape(targetUrl, retryCount + 1);
        }

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
// WAF CHALLENGE BYPASS
// =============================================================================

/**
 * Detects and attempts to bypass WAF challenge pages (Sucuri, Cloudflare JS Challenge, etc.)
 * Returns true if a challenge was detected and bypassed, false otherwise.
 */
async function handleWafChallenge(page: Page): Promise<boolean> {
    try {
        // Check for common WAF challenge indicators
        const challengeInfo = await page.evaluate(function () {
            const bodyText = document.body?.innerText || '';
            const html = document.documentElement?.outerHTML || '';

            // Sucuri WAF detection
            const isSucuri = html.includes('sucuri.net') ||
                bodyText.includes('Website Firewall') ||
                bodyText.includes('Sucuri WebSite Firewall');

            // Cloudflare JS Challenge (not captcha)
            const isCloudflare = html.includes('cf-browser-verification') ||
                html.includes('cf_chl_opt') ||
                bodyText.includes('Checking your browser');

            // DDoS-Guard
            const isDdosGuard = html.includes('ddos-guard') ||
                bodyText.includes('DDoS protection');

            // Cloudflare Turnstile / HCaptcha / ReCaptcha
            const hasCaptcha = html.includes('cf-turnstile') ||
                html.includes('g-recaptcha') ||
                html.includes('h-captcha') ||
                bodyText.includes('Verify you are human');

            // Press and Hold / Click to Verify
            const hasPressAndHold = bodyText.includes('Press and hold') ||
                bodyText.includes('Verify you are human') ||
                html.includes('px-captcha'); // PerimeterX

            // Generic JS challenge (many sites use these)
            const hasClickToProceed = bodyText.includes('Click to Proceed') ||
                bodyText.includes('click here to continue') ||
                bodyText.includes('Press to continue') ||
                bodyText.includes('Verify you are human');

            return {
                isSucuri,
                isCloudflare,
                isDdosGuard,
                hasCaptcha,
                hasPressAndHold,
                hasClickToProceed,
                isChallenge: isSucuri || isCloudflare || isDdosGuard || hasClickToProceed || hasPressAndHold || hasCaptcha
            };
        });

        if (!challengeInfo.isChallenge) {
            return false;
        }

        logger.info(`[WAF] Challenge detected: Sucuri=${challengeInfo.isSucuri}, CF=${challengeInfo.isCloudflare}, DDosGuard=${challengeInfo.isDdosGuard}`);

        // Strategy 1: Look for and click "proceed" type buttons
        if (challengeInfo.isSucuri || challengeInfo.hasClickToProceed || challengeInfo.hasPressAndHold) {
            // Wait for any JS to execute that might reveal the button
            await page.waitForTimeout(2000);

            // Common selectors for WAF proceed buttons
            const buttonSelectors = [
                'button:has-text("Proceed")',
                'button:has-text("Continue")',
                'button:has-text("Verify")',
                'a:has-text("Click to Proceed")',
                'a:has-text("Proceed to Page")',
                'input[type="submit"]',
                '.btn-sucuri',
                '#challenge-form button',
                'form button[type="submit"]',
                '#px-captcha', // PerimeterX
                'div[role="button"]:has-text("Verify")',
                '#challenge-stage' // CF Challenge
            ];

            for (const selector of buttonSelectors) {
                try {
                    const button = await page.$(selector);
                    if (button) {
                        logger.info(`[WAF] Found challenge element: ${selector}`);

                        if (challengeInfo.hasPressAndHold) {
                            // Specialized click for Press and Hold
                            const box = await button.boundingBox();
                            if (box) {
                                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                                await page.mouse.down();
                                await page.waitForTimeout(3000); // Hold for 3s
                                await page.mouse.up();
                            }
                        } else {
                            await button.click();
                        }

                        // Wait for challenge content to disappear
                        await page.waitForFunction(function () {
                            const bodyText = document.body?.innerText || '';
                            return !bodyText.includes('Website Firewall') &&
                                !bodyText.includes('Click to Proceed') &&
                                !bodyText.includes('Verify you are human') &&
                                !bodyText.includes('Sucuri');
                        }, { timeout: 10000 }).catch(() => { });

                        await page.waitForTimeout(1000);
                        return true;
                    }
                } catch (_e) {
                }
            }
        }

        // Strategy 2: Cloudflare JS Challenge - just wait for auto-redirect
        if (challengeInfo.isCloudflare) {
            logger.info('[WAF] Cloudflare challenge detected, waiting for auto-verification...');
            try {
                // CF JS challenges auto-verify and redirect after a few seconds
                await page.waitForFunction(function () {
                    const html = document.documentElement?.outerHTML || '';
                    return !html.includes('cf-browser-verification') &&
                        !html.includes('cf_chl_opt');
                }, { timeout: 15000 });
                return true;
            } catch (_e) {
                logger.warn('[WAF] Cloudflare challenge bypass timed out');
            }
        }

        // Strategy 3: Generic wait - some challenges auto-resolve
        await page.waitForTimeout(3000);

        // Check if we're past the challenge
        const stillOnChallenge = await page.evaluate(function () {
            const bodyText = document.body?.innerText || '';
            return bodyText.includes('Website Firewall') ||
                bodyText.includes('Checking your browser') ||
                bodyText.includes('Click to Proceed');
        });

        return !stillOnChallenge;
    } catch (error: any) {
        logger.warn(`[WAF] Challenge bypass error: ${error.message}`);
        return false;
    }
}

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
        const reqId = advancedScrapeCount;
        logger.info(`[Scraper:Reader] Starting scrape [Req #${reqId}] for ${targetUrl}`);
        const browser = await getBrowser();
        const viewport = getRandomViewport();
        context = await browser.newContext({
            viewport,
            userAgent: getRandomItem(USER_AGENTS),
            locale: getRandomItem(LOCALES),
            timezoneId: getRandomItem(TIMEZONES),
            bypassCSP: true,
            serviceWorkers: 'block',
            permissions: [],
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Upgrade-Insecure-Requests': '1',
            }
        });
        page = await context.newPage();
        await applyStealthScripts(page);
        await context.addInitScript("window.__name = (f) => f;");

        // Block unnecessary resources but keep images for reader mode (smartly)
        await page.route('**/*', (route: any) => {
            const request = route.request();
            const type = request.resourceType();
            const url = request.url();

            if (['media', 'font', 'stylesheet'].includes(type) || isBlockedDomain(url)) {
                route.abort();
            } else if (type === 'image') {
                // For reader mode, we want images, but maybe not huge external ones
                const isExternal = !url.includes(new URL(targetUrl).hostname);
                const isTracking = url.includes('pixel') || url.includes('analytics');
                if (isTracking || isExternal) {
                    // Still allow it if it looks like a content image but be cautious
                    route.continue();
                } else {
                    route.continue();
                }
            } else {
                route.continue();
            }
        });

        let response = await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        // Handle WAF Challenge Pages (Sucuri, Cloudflare, etc.)
        const wafBypassed = await handleWafChallenge(page);
        if (wafBypassed) {
            logger.info(`[ReaderScrape] WAF challenge bypassed for ${targetUrl}`);
            // Wait for page to fully load after bypass (important for images)
            try {
                await page.waitForLoadState('load', { timeout: 8000 });
            } catch (_e) {
                // Continue even if timeout - page might already be loaded
            }
            // Re-check the response status after bypass
            response = page.mainFrame().url() !== targetUrl ? null : response;
        }

        if (response?.status() === 403) {
            // Double check if we're still on a challenge page after attempted bypass
            const isStillBlocked = await page.evaluate(function () {
                const bodyText = document.body?.innerText || '';
                return bodyText.includes('Access Denied') ||
                    bodyText.includes('Access blocked') ||
                    bodyText.includes('Website Firewall');
            });
            if (isStillBlocked) {
                logger.warn(`[Scraper:Reader] Blocked by WAF after bypass attempt for ${targetUrl}`);
                return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'blocked', error: 'Access blocked (403)' };
            }
        }

        // 2. Smart Wait: Look for signs of "real content" rendered by JS
        try {
            await page.waitForFunction(function () {
                // Heuristic for content availability
                const article = document.querySelector('article, .article, .post, .content, main');
                const pCount = document.querySelectorAll('p').length;
                const bodyText = document.body?.innerText || '';

                // If we have an article tag or many paragraphs, it's likely ready
                if (article || pCount > 10) return true;
                // Fallback for smaller pages
                return bodyText.length > 800 && !bodyText.includes('Loading...');
            }, { timeout: 2000 }).catch(() => { });
        } catch (_e) { }

        // 3. Extraction + Processing in Browser
        const script = await loadReadabilityScript();
        if (!script) {
            logger.warn('[ReaderScrape] Readability script is empty or failed to load, extraction may fail.');
        }
        await page.addScriptTag({ content: script });

        const result = await page.evaluate(function ({ baseUrl }) {
            // @ts-ignore
            if (typeof Readability === 'undefined') {
                return { error: 'Readability script not found in browser context' };
            }
            // A. Helper for noise removal (Pre-extraction)
            const NOISE_SELECTORS = [
                '.related', '#recommended', '.read-more', '.js-related-posts',
                '.wp-block-related-posts', '.entry-related', '.post-navigation',
                '.social-share', '.author-box', '.newsletter-signup',
                '.comments-area', 'aside', 'nav', '.widget', '.ads', '.ad-unit'
            ];

            NOISE_SELECTORS.forEach(function (selector) {
                document.querySelectorAll(selector).forEach(function (el) { el.remove(); });
            });

            // B. Link Density Filter for Article Blocks
            function filterHighLinkDensity() {
                const candidates = document.querySelectorAll('div, section, article');
                candidates.forEach(function (el) {
                    const textLength = el.textContent?.trim().length || 0;
                    if (textLength < 100) return;

                    const linkCount = el.querySelectorAll('a').length;
                    const density = (linkCount * 20) / textLength;

                    // If high link density and contains "related" or "read" keywords
                    if (density > 0.4 && /related|read|more|recommended/i.test(el.className + el.id)) {
                        el.remove();
                    }
                });
            }
            filterHighLinkDensity();

            // C. Helper for download links
            function isDownloadLink(href: string, text: string) {
                const patterns = [
                    /\.(zip|7z|rar|iso|exe|dmg|pkg|apk|pdf)$/i,
                    /mega\.nz|mediafire\.com|terabox|drive\.google|pixeldrain|doodrive|gdrive|1drv\.ms|dropbox\.com/i,
                    /zippyshare|krakenfiles|workupload|gofile\.io|anonfiles|bayfiles/i,
                ];
                const textPatterns = [
                    /download/i, /get\s+(?:it|now|here)/i, /mega/i, /gdrive/i, /google\s*drive/i, /pixel/i,
                    /mirrored/i, /zippyshare/i, /doodrive/i, /terabox/i
                ];
                return patterns.some(function (p) { return p.test(href); }) || textPatterns.some(function (p) { return p.test(text); });
            }

            // D. Run Readability
            // @ts-ignore
            const docClone = document.cloneNode(true);
            // @ts-ignore
            const reader = new Readability(docClone, { keepClasses: true });
            const article = reader.parse();
            if (!article || !article.title) return null;

            // E. Post-process extracted content
            const container = document.createElement('div');
            container.innerHTML = article.content;

            // Add paragraph IDs for targeting
            const paragraphs = container.querySelectorAll('p');
            paragraphs.forEach(function (p, idx) {
                if (!p.id) {
                    p.id = `aegis-p-${idx}`;
                }
                p.setAttribute('data-aegis-paragraph', 'true');
            });

            // Fix link targets and relative URLs, filtering out social links
            const SOCIAL_DOMAINS = ['facebook.com', 'twitter.com', 'x.com', 'pinterest.com', 'whatsapp.com', 'linkedin.com', 'reddit.com', 'instagram.com', 't.me', 'telegram.me', 'discord.com'];
            const links = container.querySelectorAll('a');
            links.forEach(function (a) {
                const href = a.getAttribute('href');
                if (href) {
                    try {
                        const absUrl = new URL(href, baseUrl).href;
                        const hostname = new URL(absUrl).hostname.toLowerCase();

                        // Filter out social links
                        if (SOCIAL_DOMAINS.some(function (domain) { return hostname.includes(domain); })) {
                            a.remove();
                            return;
                        }

                        a.setAttribute('href', absUrl);
                        if (isDownloadLink(absUrl, a.textContent || '')) {
                            a.setAttribute('data-aegis-download', 'true');
                        }
                    } catch (_e) { }
                }
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            });

            // D. Extract Download Links from the FULL page (not just article)
            function getProvider(href: string): string {
                const h = href.toLowerCase();
                if (h.includes('mega.nz')) return 'mega';
                if (h.includes('mediafire.com')) return 'mediafire';
                if (h.includes('terabox')) return 'terabox';
                if (h.includes('google.com/drive') || h.includes('drive.google')) return 'google-drive';
                if (h.includes('pixeldrain.com')) return 'pixeldrain';
                if (h.includes('doodrive.com')) return 'doodrive';
                if (h.includes('1drv.ms') || h.includes('onedrive')) return 'onedrive';
                if (h.includes('zippyshare.com')) return 'zippyshare';
                return 'direct';
            }

            const allLinks = Array.from(document.querySelectorAll('a'));
            const downloadLinks = allLinks
                .filter(function (a) { return isDownloadLink(a.href, a.textContent || ''); })
                .map(function (a) {
                    return {
                        href: a.href,
                        text: (a.textContent || '').trim().replace(/^[|\s\-_/]+/, '').toUpperCase(),
                        provider: getProvider(a.href)
                    };
                })
                .filter(function (l) { return l.text.length > 0 && l.text.length < 100; })
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
            logger.warn(`[Scraper:Reader] Extraction FAILED [Req #${reqId}] for ${targetUrl}: ${errorMsg}`);
            return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: errorMsg as string };
        }

        const { article, downloadLinks = [], password = null } = result;
        let processedContent = article.content;

        // Append download section if links found
        if (downloadLinks.length > 0) {
            const linksHtml = downloadLinks.map(l => {
                const isSpecial = l.text.includes('DOWNLOAD NOW') || l.text.includes('DIRECT');
                const label = isSpecial ? (l.text.includes('DOWNLOAD NOW') ? '⬇ DOWNLOAD NOW' : l.text) : l.text;
                return `<a href="${l.href}" target="_blank" rel="noopener noreferrer" data-aegis-download="true" data-aegis-provider="${l.provider}">
                    <span class="provider-dot"></span>
                    <span class="link-label">${label}</span>
                </a>`;
            }).join('');

            const passwordHtml = password ?
                `<div class="aegis-password-container"><span class="password-label">Password:</span><code class="password-value">${password}</code></div>` : '';

            processedContent += `
                <div class="aegis-download-section">
                    <div class="aegis-download-header">
                        <span class="header-icon">📥</span>
                        <h3>Download Links</h3>
                    </div>
                    <div class="aegis-download-grid">${linksHtml}</div>
                    ${passwordHtml}
                </div>`;
        }

        logger.info(`[Scraper:Reader] SUCCESS [Req #${reqId}] for ${targetUrl}`);
        return {
            title: article.title || '',
            byline: article.byline || null,
            content: processedContent,
            textContent: article.textContent || '',
            siteName: article.siteName || null,
            status: 'success'
        };
    } catch (error: any) {
        logger.error(`[Scraper:Reader] FAILED for ${targetUrl}: ${error.message}`);
        return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: error.message };
    } finally {
        if (context) await context.close();
    }
};

/**
 * Scrapes a URL and extracts readable article content using Mozilla Readability.
 * Preserves download links and buttons while stripping ads and clutter.
 * Uses p-queue for proper async concurrency control with retries.
 */
export const readerScrape = async (targetUrl: string, retryCount = 0): Promise<ReaderContentResult> => {
    const MAX_RETRIES = 1; // Reader mode is heavier, retry less
    try {
        // Queue the scrape task with a timeout
        const result = await scrapeQueue.add(
            () => readerScrapeInternal(targetUrl),
            { timeout: SCRAPE_QUEUE_TIMEOUT }
        );

        if (result?.status === 'blocked' && retryCount < MAX_RETRIES) {
            const delay = (retryCount + 1) * 3000;
            logger.warn(`[Scraper:Reader] BLOCKED [Req #${advancedScrapeCount}]. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES}) for ${targetUrl}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return readerScrape(targetUrl, retryCount + 1);
        }

        return result ?? { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: 'Queue returned undefined' };
    } catch (error: any) {
        // Handle timeout or other queue errors
        if (error.name === 'TimeoutError' && retryCount < MAX_RETRIES) {
            logger.warn(`[ReaderScrape] Reader scrape TIMED OUT for ${targetUrl}. Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            return readerScrape(targetUrl, retryCount + 1);
        }

        if (error.name === 'TimeoutError') {
            logger.error(`[ReaderScrape] TIMED OUT in queue for ${targetUrl}`);
        } else {
            logger.error(`[ReaderScrape] Queue error for ${targetUrl}: ${error.message}`);
        }
        return { title: '', byline: null, content: '', textContent: '', siteName: null, status: 'failed', error: error.message || 'Queue timeout' };
    }
};


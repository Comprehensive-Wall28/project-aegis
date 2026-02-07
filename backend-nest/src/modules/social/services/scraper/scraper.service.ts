import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
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
import * as fs from 'fs';
import * as path from 'path';
import { USER_AGENTS } from './user-agents';
import { applyStealthScripts } from './stealth';

export interface ScrapeResult {
  title: string;
  description: string;
  image: string;
  favicon: string;
  scrapeStatus: 'success' | 'blocked' | 'failed';
}

export interface ReaderContentResult {
  title: string;
  byline: string | null;
  content: string;
  textContent: string;
  siteName: string | null;
  status: 'success' | 'blocked' | 'failed';
  error?: string;
}

const LOCALES = ['en-US', 'en-GB', 'en-CA', 'fr-FR', 'de-DE', 'es-ES'];
const TIMEZONES = [
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
];

const BLOCKED_DOMAIN_PATTERNS = [
  'googletagmanager.com',
  'google-analytics.com',
  'facebook.net',
  'connect.facebook.net',
  'twitter.com',
  'platform.twitter.com',
  'linkedin.com',
  'bing.com',
  'yandex.ru',
  'doubleclick.net',
  'adnxs.com',
  'adsystem.com',
  'adrolling.com',
  'hotjar.com',
  'segment.io',
  'amplitude.com',
  'mixpanel.com',
  'sentry.io',
  'intercom.io',
  'disqus.com',
  'disquscdn.com',
  'gravatar.com',
  'fontawesome.com',
  'typekit.net',
  'googlesyndication.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'amazon-adsystem.com',
  'scorecardresearch.com',
];

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly metascraper: any;
  private readonly scrapeQueue: PQueue;
  private browserInstance: Browser | null = null;
  private browserLaunchPromise: Promise<Browser> | null = null;
  private advancedScrapeCount = 0;
  private idleTimeout: NodeJS.Timeout | null = null;
  private readabilityScript = '';
  private readabilityLoadingPromise: Promise<string> | null = null;

  private readonly SCRAPE_QUEUE_CONCURRENCY = 4;
  private readonly SCRAPE_QUEUE_TIMEOUT = 60000;
  private readonly MAX_ADVANCED_SCRAPES = 20;
  private readonly IDLE_CLOSE_MS = 5 * 60 * 1000;

  constructor() {
    // Setup Metascraper
    this.metascraper = createMetascraper([
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
      metascraperAmazon(),
    ]);

    // Setup queue
    this.scrapeQueue = new PQueue({
      concurrency: this.SCRAPE_QUEUE_CONCURRENCY,
    });

    this.scrapeQueue.on('active', () => {
      this.logger.debug(
        `[ScrapeQueue] Task started. Queue size: ${this.scrapeQueue.size}, Pending: ${this.scrapeQueue.pending}`,
      );
    });

    this.scrapeQueue.on('idle', () => {
      this.logger.debug('[ScrapeQueue] Queue is now idle.');
    });

    this.scrapeQueue.on('error', (error) => {
      this.logger.error(`[ScrapeQueue] Task error: ${error.message}`);
    });

    // Load Readability script
    this.loadReadabilityScript();
  }

  private getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private getRandomViewport() {
    const widths = [1280, 1366, 1440, 1536, 1600, 1920];
    const heights = [720, 768, 864, 900, 1024, 1080];
    return {
      width: getRandomItem(widths) + Math.floor(Math.random() * 50),
      height: getRandomItem(heights) + Math.floor(Math.random() * 50),
    };
  }

  private isBlockedDomain(url: string): boolean {
    return BLOCKED_DOMAIN_PATTERNS.some((pattern) => url.includes(pattern));
  }

  private async loadReadabilityScript(): Promise<string> {
    if (this.readabilityScript) return this.readabilityScript;
    if (this.readabilityLoadingPromise) return this.readabilityLoadingPromise;

    this.readabilityLoadingPromise = (async () => {
      try {
        const readabilityPath = path.resolve(
          process.cwd(),
          'node_modules/@mozilla/readability/Readability.js',
        );
        const content = await fs.promises.readFile(readabilityPath, 'utf8');
        this.readabilityScript = content;
        return content;
      } catch (err) {
        this.logger.error(
          `[Scraper] Failed to load Readability script: ${err}`,
        );
        this.readabilityLoadingPromise = null;
        return '';
      }
    })();

    return this.readabilityLoadingPromise;
  }

  private async closeBrowser(): Promise<void> {
    if (this.browserInstance) {
      this.logger.log('[Scraper] Closing Playwright browser instance...');
      try {
        await this.browserInstance.close();
      } catch (err: any) {
        this.logger.error(`[Scraper] Error closing browser: ${err.message}`);
      }
      this.browserInstance = null;
      this.advancedScrapeCount = 0;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    this.idleTimeout = setTimeout(() => {
      if (this.scrapeQueue.pending === 0) {
        this.logger.log(
          '[Scraper:Internal] Browser idle timeout reached, shutting down...',
        );
        this.closeBrowser();
      }
    }, this.IDLE_CLOSE_MS);

    if (
      this.browserInstance &&
      this.advancedScrapeCount >= this.MAX_ADVANCED_SCRAPES
    ) {
      if (this.scrapeQueue.pending === 0) {
        this.logger.log(
          `[Scraper:Internal] Request limit (${this.MAX_ADVANCED_SCRAPES}) reached. Recycling browser...`,
        );
        await this.closeBrowser();
      }
    }

    if (this.browserInstance) return this.browserInstance;
    if (this.browserLaunchPromise) return this.browserLaunchPromise;

    this.logger.log(
      '[Scraper:Internal] Launching new Playwright browser instance...',
    );

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

    this.browserLaunchPromise = chromium
      .launch(launchOptions)
      .then((browser: Browser) => {
        this.browserInstance = browser;
        this.browserLaunchPromise = null;

        this.browserInstance.on('disconnected', () => {
          this.logger.log('[Scraper:Internal] Browser disconnected.');
          this.browserInstance = null;
          this.advancedScrapeCount = 0;
          this.browserLaunchPromise = null;
        });

        return browser;
      })
      .catch((err: any) => {
        this.browserLaunchPromise = null;
        throw err;
      });

    return this.browserLaunchPromise;
  }

  async simpleScrape(
    targetUrl: string,
  ): Promise<{ data: ScrapeResult | null; reason?: string }> {
    try {
      const { result, error } = await ogs({
        url: targetUrl,
        timeout: 5000,
      });

      if (error) {
        return { data: null, reason: 'OGS error' };
      }
      if (!result.success) {
        return { data: null, reason: 'OGS returned false success' };
      }

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
        scrapeStatus: 'success',
      };

      if (!data.image && !data.description) {
        return { data: null, reason: 'Missing image AND description' };
      }

      return { data };
    } catch (e: any) {
      let msg = e instanceof Error ? e.message : JSON.stringify(e);
      if (e && e.result && e.result.error) {
        msg = `OGS Error: ${e.result.error}`;
      }
      return { data: null, reason: `Exception: ${msg}` };
    }
  }

  private async handleWafChallenge(page: Page): Promise<boolean> {
    try {
      const challengeInfo = await page.evaluate(function () {
        const bodyText = document.body?.innerText || '';
        const html = document.documentElement?.outerHTML || '';

        const isSucuri =
          html.includes('sucuri.net') ||
          bodyText.includes('Website Firewall') ||
          bodyText.includes('Sucuri WebSite Firewall');

        const isCloudflare =
          html.includes('cf-browser-verification') ||
          html.includes('cf_chl_opt') ||
          bodyText.includes('Checking your browser');

        const isDdosGuard =
          html.includes('ddos-guard') || bodyText.includes('DDoS protection');

        const hasCaptcha =
          html.includes('cf-turnstile') ||
          html.includes('g-recaptcha') ||
          html.includes('h-captcha') ||
          bodyText.includes('Verify you are human');

        const hasPressAndHold =
          bodyText.includes('Press and hold') ||
          bodyText.includes('Verify you are human') ||
          html.includes('px-captcha');

        const hasClickToProceed =
          bodyText.includes('Click to Proceed') ||
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
          isChallenge:
            isSucuri ||
            isCloudflare ||
            isDdosGuard ||
            hasClickToProceed ||
            hasPressAndHold ||
            hasCaptcha,
        };
      });

      if (!challengeInfo.isChallenge) {
        return false;
      }

      this.logger.log(
        `[WAF] Challenge detected: Sucuri=${challengeInfo.isSucuri}, CF=${challengeInfo.isCloudflare}, DDosGuard=${challengeInfo.isDdosGuard}`,
      );

      if (
        challengeInfo.isSucuri ||
        challengeInfo.hasClickToProceed ||
        challengeInfo.hasPressAndHold
      ) {
        await page.waitForTimeout(2000);

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
          '#px-captcha',
          'div[role="button"]:has-text("Verify")',
          '#challenge-stage',
        ];

        for (const selector of buttonSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              this.logger.log(`[WAF] Found challenge element: ${selector}`);

              if (challengeInfo.hasPressAndHold) {
                const box = await button.boundingBox();
                if (box) {
                  await page.mouse.move(
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                  );
                  await page.mouse.down();
                  await page.waitForTimeout(3000);
                  await page.mouse.up();
                }
              } else {
                await button.click();
              }

              await page
                .waitForFunction(
                  function () {
                    const bodyText = document.body?.innerText || '';
                    return (
                      !bodyText.includes('Website Firewall') &&
                      !bodyText.includes('Click to Proceed') &&
                      !bodyText.includes('Verify you are human') &&
                      !bodyText.includes('Sucuri')
                    );
                  },
                  { timeout: 10000 },
                )
                .catch(() => {});

              await page.waitForTimeout(1000);
              return true;
            }
          } catch (_e) {
            // Continue to next selector
          }
        }
      }

      if (challengeInfo.isCloudflare) {
        this.logger.log(
          '[WAF] Cloudflare challenge detected, waiting for auto-verification...',
        );
        try {
          await page.waitForFunction(
            function () {
              const html = document.documentElement?.outerHTML || '';
              return (
                !html.includes('cf-browser-verification') &&
                !html.includes('cf_chl_opt')
              );
            },
            { timeout: 15000 },
          );
          return true;
        } catch (_e) {
          this.logger.warn('[WAF] Cloudflare challenge bypass timed out');
        }
      }

      await page.waitForTimeout(3000);

      const stillOnChallenge = await page.evaluate(function () {
        const bodyText = document.body?.innerText || '';
        return (
          bodyText.includes('Website Firewall') ||
          bodyText.includes('Checking your browser') ||
          bodyText.includes('Click to Proceed')
        );
      });

      return !stillOnChallenge;
    } catch (error: any) {
      this.logger.warn(`[WAF] Challenge bypass error: ${error.message}`);
      return false;
    }
  }

  private async advancedScrapeInternal(
    targetUrl: string,
  ): Promise<ScrapeResult> {
    this.advancedScrapeCount++;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const reqId = this.advancedScrapeCount;
      this.logger.log(
        `[Scraper:Advanced] Starting scrape [Req #${reqId}] for ${targetUrl}`,
      );
      const browser = await this.getBrowser();
      const viewport = this.getRandomViewport();
      context = await browser.newContext({
        viewport,
        userAgent: this.getRandomItem(USER_AGENTS),
        locale: this.getRandomItem(LOCALES),
        timezoneId: this.getRandomItem(TIMEZONES),
        bypassCSP: true,
        serviceWorkers: 'block',
        permissions: [],
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Ch-Ua':
            '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Upgrade-Insecure-Requests': '1',
        },
      });
      page = await context.newPage();
      await applyStealthScripts(page);
      await context.addInitScript('window.__name = (f) => f;');

      await page.route('**/*', (route: any) => {
        const request = route.request();
        const type = request.resourceType();
        const url = request.url();

        if (
          ['media', 'font', 'stylesheet'].includes(type) ||
          this.isBlockedDomain(url)
        ) {
          route.abort();
        } else if (type === 'image') {
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

      const response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      const wafBypassed = await this.handleWafChallenge(page);
      if (wafBypassed) {
        this.logger.log(`[Scraper] WAF challenge bypassed for ${targetUrl}`);
      }

      if (response?.status() === 403) {
        const isStillBlocked = await page.evaluate(function () {
          const bodyText = document.body?.innerText || '';
          return (
            bodyText.includes('Access Denied') ||
            bodyText.includes('Website Firewall')
          );
        });
        if (isStillBlocked) {
          this.logger.warn(
            `[Scraper:Advanced] Blocked by WAF after bypass attempt for ${targetUrl}`,
          );
          return {
            title: '',
            description: '',
            image: '',
            favicon: '',
            scrapeStatus: 'blocked',
          };
        }
      }

      const pageData = await page.evaluate(function () {
        const meta: Record<string, string> = {};
        document.querySelectorAll('meta').forEach(function (el) {
          const name =
            el.getAttribute('name') ||
            el.getAttribute('property') ||
            el.getAttribute('itemprop');
          const content = el.getAttribute('content');
          if (name && content) meta[name.toLowerCase()] = content;
        });

        const favicon =
          (document.querySelector('link[rel="icon"]') as HTMLLinkElement)
            ?.href ||
          (
            document.querySelector(
              'link[rel="shortcut icon"]',
            ) as HTMLLinkElement
          )?.href ||
          '';

        return {
          html:
            `<head><title>${document.title}</title>` +
            Array.from(document.querySelectorAll('meta'))
              .map(function (m) {
                return m.outerHTML;
              })
              .join('') +
            '</head>',
          url: window.location.href,
          favicon,
        };
      });

      const metadata = await this.metascraper({
        html: pageData.html,
        url: pageData.url,
      });

      this.logger.log(
        `[Scraper:Advanced] SUCCESS [Req #${reqId}] for ${targetUrl}`,
      );
      return {
        title: metadata.title || '',
        description: metadata.description || '',
        image: metadata.image || '',
        favicon: metadata.logo || metadata.favicon || pageData.favicon || '',
        scrapeStatus: 'success',
      };
    } catch (error: any) {
      this.logger.error(
        `[Scraper:Advanced] FAILED for ${targetUrl}: ${error.message}`,
      );
      return {
        title: '',
        description: '',
        image: '',
        favicon: '',
        scrapeStatus: 'failed',
      };
    } finally {
      if (context) await context.close();
    }
  }

  async advancedScrape(
    targetUrl: string,
    retryCount = 0,
  ): Promise<ScrapeResult> {
    const MAX_RETRIES = 2;
    try {
      const result = await this.scrapeQueue.add(
        () => this.advancedScrapeInternal(targetUrl),
        { timeout: this.SCRAPE_QUEUE_TIMEOUT },
      );

      if (result?.scrapeStatus === 'blocked' && retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 5000;
        this.logger.warn(
          `[Scraper:Advanced] BLOCKED [Req #${this.advancedScrapeCount}]. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES}) for ${targetUrl}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.advancedScrape(targetUrl, retryCount + 1);
      }

      return (
        result ?? {
          title: '',
          description: '',
          image: '',
          favicon: '',
          scrapeStatus: 'failed',
        }
      );
    } catch (error: any) {
      if (error.name === 'TimeoutError' && retryCount < MAX_RETRIES) {
        this.logger.warn(
          `[Scraper] Advanced scrape TIMED OUT for ${targetUrl}. Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
        );
        return this.advancedScrape(targetUrl, retryCount + 1);
      }

      if (error.name === 'TimeoutError') {
        this.logger.error(
          `[Scraper] Advanced scrape TIMED OUT in queue for ${targetUrl}`,
        );
      } else {
        this.logger.error(
          `[Scraper] Advanced scrape queue error for ${targetUrl}: ${error.message}`,
        );
      }
      return {
        title: '',
        description: '',
        image: '',
        favicon: '',
        scrapeStatus: 'failed',
      };
    }
  }

  async smartScrape(targetUrl: string): Promise<ScrapeResult> {
    this.logger.log(`[Scraper] Starting Smart Scrape for: ${targetUrl}`);

    const { data, reason } = await this.simpleScrape(targetUrl);

    if (data) {
      this.logger.log(`[Scraper] Simple Scrape SUCCESS for: ${targetUrl}`);
      return data;
    }

    this.logger.log(
      `[Scraper] Simple Scrape SKIPPED for: ${targetUrl}. Reason: ${reason || 'Unknown'}. Switching to Advanced Scrape.`,
    );
    return this.advancedScrape(targetUrl);
  }

  private async readerScrapeInternal(
    targetUrl: string,
  ): Promise<ReaderContentResult> {
    this.advancedScrapeCount++;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const reqId = this.advancedScrapeCount;
      this.logger.log(
        `[Scraper:Reader] Starting scrape [Req #${reqId}] for ${targetUrl}`,
      );
      const browser = await this.getBrowser();
      const viewport = this.getRandomViewport();
      context = await browser.newContext({
        viewport,
        userAgent: this.getRandomItem(USER_AGENTS),
        locale: this.getRandomItem(LOCALES),
        timezoneId: this.getRandomItem(TIMEZONES),
        bypassCSP: true,
        serviceWorkers: 'block',
        permissions: [],
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Ch-Ua':
            '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Upgrade-Insecure-Requests': '1',
        },
      });
      page = await context.newPage();
      await applyStealthScripts(page);
      await context.addInitScript('window.__name = (f) => f;');

      await page.route('**/*', (route: any) => {
        const request = route.request();
        const type = request.resourceType();
        const url = request.url();

        if (
          ['media', 'font', 'stylesheet'].includes(type) ||
          this.isBlockedDomain(url)
        ) {
          route.abort();
        } else if (type === 'image') {
          const isExternal = !url.includes(new URL(targetUrl).hostname);
          const isTracking = url.includes('pixel') || url.includes('analytics');
          if (isTracking || isExternal) {
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
        timeout: 45000,
      });

      const wafBypassed = await this.handleWafChallenge(page);
      if (wafBypassed) {
        this.logger.log(
          `[ReaderScrape] WAF challenge bypassed for ${targetUrl}`,
        );
        try {
          await page.waitForLoadState('load', { timeout: 8000 });
        } catch (_e) {
          // Continue even if timeout
        }
        response = page.mainFrame().url() !== targetUrl ? null : response;
      }

      if (response?.status() === 403) {
        const isStillBlocked = await page.evaluate(function () {
          const bodyText = document.body?.innerText || '';
          return (
            bodyText.includes('Access Denied') ||
            bodyText.includes('Access blocked') ||
            bodyText.includes('Website Firewall')
          );
        });
        if (isStillBlocked) {
          this.logger.warn(
            `[Scraper:Reader] Blocked by WAF after bypass attempt for ${targetUrl}`,
          );
          return {
            title: '',
            byline: null,
            content: '',
            textContent: '',
            siteName: null,
            status: 'blocked',
            error: 'Access blocked (403)',
          };
        }
      }

      try {
        await page
          .waitForFunction(
            function () {
              const article = document.querySelector(
                'article, .article, .post, .content, main',
              );
              const pCount = document.querySelectorAll('p').length;
              const bodyText = document.body?.innerText || '';

              if (article || pCount > 10) return true;
              return bodyText.length > 800 && !bodyText.includes('Loading...');
            },
            { timeout: 2000 },
          )
          .catch(() => {});
      } catch (_e) {}

      const script = await this.loadReadabilityScript();
      if (!script) {
        this.logger.warn(
          '[ReaderScrape] Readability script is empty or failed to load, extraction may fail.',
        );
      }
      await page.addScriptTag({ content: script });

      const result = await page.evaluate(
        function ({ baseUrl }) {
          if (typeof (window as any).Readability === 'undefined') {
            return { error: 'Readability script not found in browser context' };
          }

          const NOISE_SELECTORS = [
            '.related',
            '#recommended',
            '.read-more',
            '.js-related-posts',
            '.wp-block-related-posts',
            '.entry-related',
            '.post-navigation',
            '.social-share',
            '.author-box',
            '.newsletter-signup',
            '.comments-area',
            'aside',
            'nav',
            '.widget',
            '.ads',
            '.ad-unit',
          ];

          NOISE_SELECTORS.forEach(function (selector) {
            document.querySelectorAll(selector).forEach(function (el) {
              el.remove();
            });
          });

          function filterHighLinkDensity() {
            const candidates = document.querySelectorAll(
              'div, section, article',
            );
            candidates.forEach(function (el) {
              const textLength = el.textContent?.trim().length || 0;
              if (textLength < 100) return;

              const linkCount = el.querySelectorAll('a').length;
              const density = (linkCount * 20) / textLength;

              if (
                density > 0.4 &&
                /related|read|more|recommended/i.test(el.className + el.id)
              ) {
                el.remove();
              }
            });
          }
          filterHighLinkDensity();

          function isDownloadLink(href: string, text: string) {
            const patterns = [
              /\.(zip|7z|rar|iso|exe|dmg|pkg|apk|pdf)$/i,
              /mega\.nz|mediafire\.com|terabox|drive\.google|pixeldrain|doodrive|gdrive|1drv\.ms|dropbox\.com/i,
              /zippyshare|krakenfiles|workupload|gofile\.io|anonfiles|bayfiles/i,
            ];
            const textPatterns = [
              /download/i,
              /get\s+(?:it|now|here)/i,
              /mega/i,
              /gdrive/i,
              /google\s*drive/i,
              /pixel/i,
              /mirrored/i,
              /zippyshare/i,
              /doodrive/i,
              /terabox/i,
            ];
            return (
              patterns.some(function (p) {
                return p.test(href);
              }) ||
              textPatterns.some(function (p) {
                return p.test(text);
              })
            );
          }

          const docClone = document.cloneNode(true);
          const reader = new (window as any).Readability(docClone, {
            keepClasses: true,
          });
          const article = reader.parse();
          if (!article || !article.title) return null;

          const container = document.createElement('div');
          container.innerHTML = article.content;

          const paragraphs = container.querySelectorAll('p');
          paragraphs.forEach(function (p, idx) {
            if (!p.id) {
              p.id = `aegis-p-${idx}`;
            }
            p.setAttribute('data-aegis-paragraph', 'true');
          });

          const SOCIAL_DOMAINS = [
            'facebook.com',
            'twitter.com',
            'x.com',
            'pinterest.com',
            'whatsapp.com',
            'linkedin.com',
            'reddit.com',
            'instagram.com',
            't.me',
            'telegram.me',
            'discord.com',
          ];
          const links = container.querySelectorAll('a');
          links.forEach(function (a) {
            const href = a.getAttribute('href');
            if (href) {
              try {
                const absUrl = new URL(href, baseUrl).href;
                const hostname = new URL(absUrl).hostname.toLowerCase();

                if (
                  SOCIAL_DOMAINS.some(function (domain) {
                    return hostname.includes(domain);
                  })
                ) {
                  a.remove();
                  return;
                }

                a.setAttribute('href', absUrl);
                if (isDownloadLink(absUrl, a.textContent || '')) {
                  a.setAttribute('data-aegis-download', 'true');
                }
              } catch (_e) {}
            }
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          });

          function getProvider(href: string): string {
            const h = href.toLowerCase();
            if (h.includes('mega.nz')) return 'mega';
            if (h.includes('mediafire.com')) return 'mediafire';
            if (h.includes('terabox')) return 'terabox';
            if (h.includes('google.com/drive') || h.includes('drive.google'))
              return 'google-drive';
            if (h.includes('pixeldrain.com')) return 'pixeldrain';
            if (h.includes('doodrive.com')) return 'doodrive';
            if (h.includes('1drv.ms') || h.includes('onedrive'))
              return 'onedrive';
            if (h.includes('zippyshare.com')) return 'zippyshare';
            return 'direct';
          }

          const allLinks = Array.from(document.querySelectorAll('a'));
          const downloadLinks = allLinks
            .filter(function (a) {
              return isDownloadLink(a.href, a.textContent || '');
            })
            .map(function (a) {
              return {
                href: a.href,
                text: (a.textContent || '')
                  .trim()
                  .replace(/^[|\s\-_/]+/, '')
                  .toUpperCase(),
                provider: getProvider(a.href),
              };
            })
            .filter(function (l) {
              return l.text.length > 0 && l.text.length < 100;
            })
            .slice(0, 25);

          const passwordMatch = document.body.innerText.match(
            /Password\s*[:]\s*([^\n\s]+)/i,
          );

          return {
            article: {
              ...article,
              content: container.innerHTML,
            },
            downloadLinks,
            password: passwordMatch ? passwordMatch[1] : null,
          };
        },
        { baseUrl: targetUrl },
      );

      if (!result || !('article' in result) || !result.article) {
        const errorMsg =
          result && 'error' in result ? result.error : 'No readable content';
        this.logger.warn(
          `[Scraper:Reader] Extraction FAILED [Req #${reqId}] for ${targetUrl}: ${errorMsg}`,
        );
        return {
          title: '',
          byline: null,
          content: '',
          textContent: '',
          siteName: null,
          status: 'failed',
          error: errorMsg as string,
        };
      }

      const { article, downloadLinks = [], password = null } = result;
      let processedContent = article.content;

      if (downloadLinks.length > 0) {
        const linksHtml = downloadLinks
          .map((l) => {
            const isSpecial =
              l.text.includes('DOWNLOAD NOW') || l.text.includes('DIRECT');
            const label = isSpecial
              ? l.text.includes('DOWNLOAD NOW')
                ? '⬇ DOWNLOAD NOW'
                : l.text
              : l.text;
            return `<a href="${l.href}" target="_blank" rel="noopener noreferrer" data-aegis-download="true" data-aegis-provider="${l.provider}">
                        <span class="provider-dot"></span>
                        <span class="link-label">${label}</span>
                    </a>`;
          })
          .join('');

        const passwordHtml = password
          ? `<div class="aegis-password-container"><span class="password-label">Password:</span><code class="password-value">${password}</code></div>`
          : '';

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

      this.logger.log(
        `[Scraper:Reader] SUCCESS [Req #${reqId}] for ${targetUrl}`,
      );
      return {
        title: article.title || '',
        byline: article.byline || null,
        content: processedContent,
        textContent: article.textContent || '',
        siteName: article.siteName || null,
        status: 'success',
      };
    } catch (error: any) {
      this.logger.error(
        `[Scraper:Reader] FAILED for ${targetUrl}: ${error.message}`,
      );
      return {
        title: '',
        byline: null,
        content: '',
        textContent: '',
        siteName: null,
        status: 'failed',
        error: error.message,
      };
    } finally {
      if (context) await context.close();
    }
  }

  async readerScrape(
    targetUrl: string,
    retryCount = 0,
  ): Promise<ReaderContentResult> {
    const MAX_RETRIES = 1;
    try {
      const result = await this.scrapeQueue.add(
        () => this.readerScrapeInternal(targetUrl),
        { timeout: this.SCRAPE_QUEUE_TIMEOUT },
      );

      if (result?.status === 'blocked' && retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 3000;
        this.logger.warn(
          `[Scraper:Reader] BLOCKED [Req #${this.advancedScrapeCount}]. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES}) for ${targetUrl}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.readerScrape(targetUrl, retryCount + 1);
      }

      return (
        result ?? {
          title: '',
          byline: null,
          content: '',
          textContent: '',
          siteName: null,
          status: 'failed',
          error: 'Queue returned undefined',
        }
      );
    } catch (error: any) {
      if (error.name === 'TimeoutError' && retryCount < MAX_RETRIES) {
        this.logger.warn(
          `[ReaderScrape] Reader scrape TIMED OUT for ${targetUrl}. Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
        );
        return this.readerScrape(targetUrl, retryCount + 1);
      }

      if (error.name === 'TimeoutError') {
        this.logger.error(`[ReaderScrape] TIMED OUT in queue for ${targetUrl}`);
      } else {
        this.logger.error(
          `[ReaderScrape] Queue error for ${targetUrl}: ${error.message}`,
        );
      }
      return {
        title: '',
        byline: null,
        content: '',
        textContent: '',
        siteName: null,
        status: 'failed',
        error: error.message || 'Queue timeout',
      };
    }
  }
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

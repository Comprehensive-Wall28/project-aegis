import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { applyStealthScripts } from './utils/stealth';
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
  content: string; // Cleaned HTML content
  textContent: string; // Plain text version
  siteName: string | null;
  status: 'success' | 'blocked' | 'failed';
  error?: string;
}

@Injectable()
export class ScraperService implements OnModuleDestroy {
  private readonly logger = new Logger(ScraperService.name);
  private readonly metascraper = createMetascraper([
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

  private readonly scrapeQueue = new PQueue({
    concurrency: 4, // Maximize for 2GB RAM
  });

  private browserInstance: Browser | null = null;
  private browserLaunchPromise: Promise<Browser> | null = null;
  private advancedScrapeCount = 0;
  private idleTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_ADVANCED_SCRAPES = 20;
  private readonly IDLE_CLOSE_MS = 5 * 60 * 1000; // 5 minutes
  private readabilityScript = '';

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  ];

  private readonly LOCALES = [
    'en-US',
    'en-GB',
    'en-CA',
    'fr-FR',
    'de-DE',
    'es-ES',
  ];
  private readonly TIMEZONES = [
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
  ];

  private readonly BLOCKED_DOMAIN_PATTERNS = [
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
    'adnxs.com',
    'scorecardresearch.com',
  ];

  constructor() {
    this.loadReadability();
    this.setupQueueListeners();
  }

  private setupQueueListeners() {
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
  }

  private loadReadability() {
    try {
      // Adjust path to find Readability in node_modules
      // In NestJS build, we might need to check multiple locations or use require.resolve
      const readabilityPath = path.resolve(
        process.cwd(),
        'node_modules/@mozilla/readability/Readability.js',
      );
      if (fs.existsSync(readabilityPath)) {
        this.readabilityScript = fs.readFileSync(readabilityPath, 'utf8');
      } else {
        this.logger.warn(`Readability script not found at ${readabilityPath}`);
      }
    } catch (err) {
      this.logger.error(`Failed to load Readability script: ${err}`);
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  private async getBrowser(): Promise<Browser> {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    this.idleTimeout = setTimeout(() => {
      if (this.scrapeQueue.pending === 0) {
        this.logger.log('Browser idle timeout reached, shutting down...');
        this.closeBrowser();
      }
    }, this.IDLE_CLOSE_MS);

    if (
      this.browserInstance &&
      this.advancedScrapeCount >= this.MAX_ADVANCED_SCRAPES
    ) {
      if (this.scrapeQueue.pending === 0) {
        this.logger.log(
          `Request limit (${this.MAX_ADVANCED_SCRAPES}) reached. Recycling browser...`,
        );
        await this.closeBrowser();
      }
    }

    if (this.browserInstance) return this.browserInstance;
    if (this.browserLaunchPromise) return this.browserLaunchPromise;

    this.logger.log('Launching new Playwright browser instance...');

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

    if (executablePath && fs.existsSync(executablePath)) {
      launchOptions.executablePath = executablePath;
    }

    this.browserLaunchPromise = chromium
      .launch(launchOptions)
      .then((browser: Browser) => {
        this.browserInstance = browser;
        this.browserLaunchPromise = null;

        this.browserInstance.on('disconnected', () => {
          this.logger.log('Browser disconnected.');
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

  private async closeBrowser() {
    if (this.browserInstance) {
      this.logger.log('Closing Playwright browser instance...');
      try {
        await this.browserInstance.close();
      } catch (err: any) {
        this.logger.error(`Error closing browser: ${err.message}`);
      }
      this.browserInstance = null;
      this.advancedScrapeCount = 0;
    }
  }

  private getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private getRandomViewport() {
    const widths = [1280, 1366, 1440, 1536, 1600, 1920];
    const heights = [720, 768, 864, 900, 1024, 1080];
    return {
      width: this.getRandomItem(widths) + Math.floor(Math.random() * 50),
      height: this.getRandomItem(heights) + Math.floor(Math.random() * 50),
    };
  }

  private isBlockedDomain(url: string): boolean {
    return this.BLOCKED_DOMAIN_PATTERNS.some((pattern) =>
      url.includes(pattern),
    );
  }

  async simpleScrape(
    targetUrl: string,
  ): Promise<{ data: ScrapeResult | null; reason?: string }> {
    try {
      const { result, error } = await (ogs as any)({
        url: targetUrl,
        timeout: 5000,
      });

      if (error) return { data: null, reason: 'OGS error' };
      if (!result.success)
        return { data: null, reason: 'OGS returned false success' };
      if (!result.ogTitle) return { data: null, reason: 'Missing ogTitle' };

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
      return { data: null, reason: `Exception: ${e.message}` };
    }
  }

  async smartScrape(targetUrl: string): Promise<ScrapeResult> {
    this.logger.log(`Starting Smart Scrape for: ${targetUrl}`);
    const { data, reason } = await this.simpleScrape(targetUrl);
    if (data) return data;

    this.logger.log(
      `Simple Scrape failed (${reason}). Switching to Advanced Scrape.`,
    );
    return this.advancedScrape(targetUrl);
  }

  async advancedScrape(
    targetUrl: string,
    retryCount = 0,
  ): Promise<ScrapeResult> {
    const MAX_RETRIES = 2;
    try {
      const result = await this.scrapeQueue.add(
        () => this.advancedScrapeInternal(targetUrl),
        {
          timeout: 60000,
        },
      );

      if (result?.scrapeStatus === 'blocked' && retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 5000;
        this.logger.warn(
          `Blocked. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
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
        return this.advancedScrape(targetUrl, retryCount + 1);
      }
      this.logger.error(
        `Advanced scrape failed for ${targetUrl}: ${error.message}`,
      );
      return {
        title: '',
        description: '',
        image: '',
        favicon: '',
        scrapeStatus: 'failed',
      };
    }
  }

  private async advancedScrapeInternal(
    targetUrl: string,
  ): Promise<ScrapeResult> {
    this.advancedScrapeCount++;
    let context: BrowserContext | null = null;
    try {
      const browser = await this.getBrowser();
      context = await browser.newContext({
        viewport: this.getRandomViewport(),
        userAgent: this.getRandomItem(this.USER_AGENTS),
        locale: this.getRandomItem(this.LOCALES),
        timezoneId: this.getRandomItem(this.TIMEZONES),
        bypassCSP: true,
        serviceWorkers: 'block',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const page = await context.newPage();
      await applyStealthScripts(page);

      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        const url = route.request().url();
        if (
          ['media', 'font', 'stylesheet'].includes(type) ||
          this.isBlockedDomain(url)
        ) {
          route.abort();
        } else if (type === 'image') {
          const isExternal = !url.includes(new URL(targetUrl).hostname);
          isExternal ? route.abort() : route.continue();
        } else {
          route.continue();
        }
      });

      const response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await this.handleWafChallenge(page);

      if (response?.status() === 403) {
        return {
          title: '',
          description: '',
          image: '',
          favicon: '',
          scrapeStatus: 'blocked',
        };
      }

      const pageData = await page.evaluate(() => {
        const favicon =
          (document.querySelector('link[rel="icon"]') as HTMLLinkElement)
            ?.href || '';
        return {
          html:
            `<head><title>${document.title}</title>` +
            Array.from(document.querySelectorAll('meta'))
              .map((m) => m.outerHTML)
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
      return {
        title: metadata.title || '',
        description: metadata.description || '',
        image: metadata.image || '',
        favicon: metadata.logo || metadata.favicon || pageData.favicon || '',
        scrapeStatus: 'success',
      };
    } finally {
      if (context) await context.close();
    }
  }

  async readerScrape(targetUrl: string): Promise<ReaderContentResult> {
    return this.scrapeQueue.add(() => this.readerScrapeInternal(targetUrl), {
      timeout: 90000,
    });
  }

  private async readerScrapeInternal(
    targetUrl: string,
  ): Promise<ReaderContentResult> {
    this.advancedScrapeCount++;
    let context: BrowserContext | null = null;
    try {
      const browser = await this.getBrowser();
      context = await browser.newContext({
        viewport: this.getRandomViewport(),
        userAgent: this.getRandomItem(this.USER_AGENTS),
        bypassCSP: true,
      });

      const page = await context.newPage();
      await applyStealthScripts(page);

      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (
          ['media', 'font', 'stylesheet'].includes(type) ||
          this.isBlockedDomain(route.request().url())
        ) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await this.handleWafChallenge(page);

      if (this.readabilityScript) {
        await page.addScriptTag({ content: this.readabilityScript });
      }

      const result = await page.evaluate(() => {
        // @ts-ignore
        if (typeof Readability === 'undefined')
          return { error: 'Readability not found' };
        // @ts-ignore
        const reader = new Readability(document.cloneNode(true));
        const article = reader.parse();
        return article;
      });

      if (!result || (result as any).error) {
        return {
          title: '',
          byline: null,
          content: '',
          textContent: '',
          siteName: null,
          status: 'failed',
          error: (result as any)?.error || 'Parse failed',
        };
      }

      return {
        title: result.title,
        byline: result.byline,
        content: result.content,
        textContent: result.textContent,
        siteName: result.siteName,
        status: 'success',
      };
    } finally {
      if (context) await context.close();
    }
  }

  private async handleWafChallenge(page: Page): Promise<boolean> {
    try {
      const challengeInfo = await page.evaluate(() => {
        const html = document.documentElement.outerHTML;
        const bodyText = document.body?.innerText || '';
        return {
          isSucuri:
            html.includes('sucuri.net') ||
            bodyText.includes('Website Firewall'),
          isCloudflare:
            html.includes('cf-browser-verification') ||
            bodyText.includes('Checking your browser'),
          isChallenge:
            html.includes('sucuri') ||
            html.includes('cf-browser-verification') ||
            bodyText.includes('Verify you are human'),
        };
      });

      if (!challengeInfo.isChallenge) return false;

      if (challengeInfo.isSucuri) {
        const button = await page.$('button:has-text("Proceed"), .btn-sucuri');
        if (button) {
          await button.click();
          await page.waitForTimeout(2000);
        }
      }

      if (challengeInfo.isCloudflare) {
        await page.waitForTimeout(5000); // Wait for CF auto-redirect
      }

      return true;
    } catch (e) {
      return false;
    }
  }
}

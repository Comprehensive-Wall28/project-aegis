import { Test, TestingModule } from '@nestjs/testing';
import { ScraperService } from './scraper.service';

// Mock evaluate function
const mockEvaluate = jest.fn();

const mockPage = {
  route: jest.fn().mockResolvedValue(undefined),
  goto: jest.fn().mockResolvedValue({ status: () => 200 }),
  evaluate: mockEvaluate,
  close: jest.fn().mockResolvedValue(undefined),
  content: jest.fn().mockResolvedValue('<html></html>'),
  url: jest.fn().mockReturnValue('https://example.com'),
  addScriptTag: jest.fn().mockResolvedValue(undefined),
  addInitScript: jest.fn().mockResolvedValue(undefined),
  $: jest.fn().mockResolvedValue(null),
  waitForTimeout: jest.fn().mockResolvedValue(undefined),
};

const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

// Mock playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockImplementation(() => Promise.resolve(mockBrowser)),
  },
}));

// Mock all metascraper plugins
jest.mock('metascraper-title', () => () => jest.fn());
jest.mock('metascraper-description', () => () => jest.fn());
jest.mock('metascraper-image', () => () => jest.fn());
jest.mock('metascraper-logo', () => () => jest.fn());
jest.mock('metascraper-clearbit', () => () => jest.fn());
jest.mock('metascraper-author', () => () => jest.fn());
jest.mock('metascraper-url', () => () => jest.fn());
jest.mock('metascraper-youtube', () => () => jest.fn());
jest.mock('metascraper-twitter', () => () => jest.fn());
jest.mock('metascraper-instagram', () => () => jest.fn());
jest.mock('metascraper-amazon', () => () => jest.fn());

// Mock p-queue
jest.mock('p-queue', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockImplementation((fn) => fn()),
    on: jest.fn(),
    size: 0,
    pending: 0,
  }));
});

// Mock metascraper
jest.mock('metascraper', () => {
  return jest.fn().mockImplementation(() => {
    return jest.fn().mockResolvedValue({
      title: 'Mock Title',
      description: 'Mock Description',
      image: 'Mock Image',
    });
  });
});

// Mock open-graph-scraper
jest.mock('open-graph-scraper', () => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      result: {
        success: true,
        ogTitle: 'OG Title',
        ogDescription: 'OG Description',
        ogImage: [{ url: 'https://example.com/image.jpg' }],
        favicon: 'favicon.ico',
      },
      error: false,
    }),
  );
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('// readability script'),
}));

describe('ScraperService', () => {
  let service: ScraperService;

  beforeEach(async () => {
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScraperService],
    }).compile();

    service = module.get<ScraperService>(ScraperService);

    jest.clearAllMocks();
    mockEvaluate.mockReset();
    // Default mock implementation to handle multiple evaluate calls
    mockEvaluate.mockImplementation((fn) => {
      if (typeof fn === 'function') {
        const fnStr = fn.toString();
        if (fnStr.includes('isSucuri')) {
          return Promise.resolve({ isChallenge: false });
        }
        if (fnStr.includes('Readability')) {
          return Promise.resolve({
            title: 'Mock Title',
            content: 'Mock Content',
          });
        }
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('simpleScrape', () => {
    it('should return data for valid URL', async () => {
      const result = await service.simpleScrape('https://example.com');
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('OG Title');
    });

    it('should return null if ogs fails', async () => {
      const ogs = require('open-graph-scraper');
      ogs.mockResolvedValueOnce({ error: true });
      const result = await service.simpleScrape('https://example.com');
      expect(result.data).toBeNull();
    });
  });

  describe('smartScrape', () => {
    it('should fall back to advancedScrape if simpleScrape fails', async () => {
      jest.spyOn(service, 'simpleScrape').mockResolvedValue({ data: null });

      const result = await service.smartScrape('https://example.com');
      expect(result.scrapeStatus).toBe('success');
      expect(result.title).toBe('Mock Title');
    });
  });

  describe('advancedScrape', () => {
    it('should retry on blocked status', async () => {
      const spy = jest
        .spyOn(service as any, 'advancedScrapeInternal')
        .mockResolvedValueOnce({ scrapeStatus: 'blocked' })
        .mockResolvedValueOnce({ scrapeStatus: 'success', title: 'Success' });

      const promise = service.advancedScrape('https://ex.com');

      await Promise.resolve();
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      const result = await promise;
      expect(spy).toHaveBeenCalledTimes(2);
      expect(result.scrapeStatus).toBe('success');
    });

    it('should return failed status on error', async () => {
      jest
        .spyOn(service as any, 'advancedScrapeInternal')
        .mockRejectedValue(new Error('Network error'));
      const result = await service.advancedScrape('https://ex.com');
      expect(result.scrapeStatus).toBe('failed');
    });
  });

  describe('readerScrape', () => {
    it('should return failed status if parsing fails', async () => {
      mockEvaluate.mockImplementation((fn) => {
        const fnStr = fn.toString();
        if (fnStr.includes('isSucuri'))
          return Promise.resolve({ isChallenge: false });
        if (fnStr.includes('Readability'))
          return Promise.resolve({ error: 'Readability error' });
        return Promise.resolve({});
      });

      const result = await service.readerScrape('https://ex.com');
      expect(result.status).toBe('failed');
    });
  });
});

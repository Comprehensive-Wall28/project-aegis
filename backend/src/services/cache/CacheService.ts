import { LRUCache } from 'lru-cache';
import logger from '../../utils/logger';

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: LRUCache<string, any>;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };
  private enabled: boolean;

  private constructor() {
    this.enabled = process.env.CACHE_ENABLED !== 'false';
    
    const maxItems = parseInt(process.env.CACHE_MAX_ITEMS || '5000', 10);
    const defaultTtl = parseInt(process.env.CACHE_DEFAULT_TTL || '300000', 10);
    const maxSizeMb = parseInt(process.env.CACHE_MAX_SIZE_MB || '50', 10);
    
    this.cache = new LRUCache({
      max: maxItems,
      ttl: defaultTtl,
      updateAgeOnGet: true,
      allowStale: false,
      maxSize: maxSizeMb * 1024 * 1024,
      sizeCalculation: (value) => {
        try {
          return JSON.stringify(value).length;
        } catch {
          return 1024;
        }
      },
    });

    logger.info(`CacheService initialized (enabled: ${this.enabled}, maxItems: ${maxItems}, defaultTTL: ${defaultTtl}ms)`);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value as T;
    }
    this.stats.misses++;
    return undefined;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.enabled) return;

    try {
      this.cache.set(key, value, { ttl });
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  deleteByPattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    if (deleted > 0) {
      logger.debug(`Cache invalidation: deleted ${deleted} entries matching pattern ${pattern}`);
    }
    
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    logger.info('Cache cleared');
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }
}

export default CacheService.getInstance();

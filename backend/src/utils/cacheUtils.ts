import cacheService from '../services/cache/CacheService';
import logger from './logger';

interface CacheableOptions {
  key: string;
  ttl?: number;
}

export async function withCache<T>(
  options: CacheableOptions,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = cacheService.get<T>(options.key);
  if (cached !== undefined) {
    return cached;
  }

  const data = await fetchFn();
  cacheService.set(options.key, data, options.ttl);
  
  return data;
}

export function invalidateCache(pattern: string): number {
  return cacheService.deleteByPattern(pattern);
}

export const CacheInvalidator = {
  userFiles(userId: string): number {
    const count = cacheService.deleteByPattern(`aegis:${userId}:files:*`);
    logger.debug(`Invalidated ${count} file cache entries for user ${userId}`);
    return count;
  },

  userCalendar(userId: string): number {
    const count = cacheService.deleteByPattern(`aegis:${userId}:calendar:*`);
    logger.debug(`Invalidated ${count} calendar cache entries for user ${userId}`);
    return count;
  },

  userTasks(userId: string): number {
    const count = cacheService.deleteByPattern(`aegis:${userId}:tasks:*`);
    logger.debug(`Invalidated ${count} task cache entries for user ${userId}`);
    return count;
  },

  userNotes(userId: string): number {
    const count = cacheService.deleteByPattern(`aegis:${userId}:notes:*`);
    logger.debug(`Invalidated ${count} note cache entries for user ${userId}`);
    return count;
  },

  userFolders(userId: string): number {
    const count = cacheService.deleteByPattern(`aegis:${userId}:folders:*`);
    logger.debug(`Invalidated ${count} folder cache entries for user ${userId}`);
    return count;
  },

  userProfile(userId: string): number {
    const count = cacheService.deleteByPattern(`aegis:${userId}:profile:*`);
    logger.debug(`Invalidated ${count} profile cache entries for user ${userId}`);
    return count;
  },

  clearAll(): void {
    cacheService.clear();
    logger.info('All cache entries cleared');
  },
};

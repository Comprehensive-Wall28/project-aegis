import { LRUCache } from 'lru-cache';

/**
 * JWT cache using LRU (Least Recently Used) strategy.
 * Caches decoded JWT tokens to avoid expensive decryption and verification on every request.
 * Matches the legacy backend pattern (though the file was missing in legacy).
 */

interface JwtCacheEntry {
    id: string;
    username: string;
    iat: number;
    exp: number;
}

// Cache up to 10,000 tokens with 5 minute TTL
const jwtCache = new LRUCache<string, JwtCacheEntry>({
    max: 10000,
    ttl: 1000 * 60 * 5, // 5 minutes
});

export function getCachedJwt(token: string): JwtCacheEntry | undefined {
    return jwtCache.get(token);
}

export function setCachedJwt(token: string, decoded: JwtCacheEntry): void {
    jwtCache.set(token, decoded);
}

export function clearJwtCache(): void {
    jwtCache.clear();
}

export function getJwtCacheStats() {
    return {
        size: jwtCache.size,
        maxSize: jwtCache.max,
    };
}

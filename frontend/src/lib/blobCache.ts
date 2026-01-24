/**
 * Simple in-memory cache for Blob URLs to avoid redundant decryption 
 * and "Decrypting..." flashes.
 */
class BlobCache {
    private cache: Map<string, string> = new Map();

    /**
     * Store a Blob URL in the cache.
     * @param id The reference ID (mediaId or fileId)
     * @param url The generated object URL
     */
    set(id: string, url: string) {
        this.cache.set(id, url);
    }

    /**
     * Get a Blob URL from the cache.
     */
    get(id: string): string | undefined {
        return this.cache.get(id);
    }

    /**
     * Remove a specific URL from the cache.
     * Note: This does NOT revoke the URL, as it might be used elsewhere.
     */
    remove(id: string) {
        this.cache.delete(id);
    }

    /**
     * Clear all cached URLs.
     */
    clear() {
        this.cache.clear();
    }
}

export const blobCache = new BlobCache();

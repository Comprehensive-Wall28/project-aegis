const DB_NAME = 'aegis-cache';
const STORE_NAME = 'backgrounds';
const DB_VERSION = 1;

interface CacheEntry {
    fileId: string;
    blob: Blob;
    timestamp: number;
}

export const backgroundCache = {
    async openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
                }
            };
        });
    },

    async save(fileId: string, blob: Blob): Promise<void> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const entry: CacheEntry = {
                fileId,
                blob,
                timestamp: Date.now()
            };

            const request = store.put(entry);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    async get(fileId: string): Promise<Blob | null> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);

            const request = store.get(fileId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const entry = request.result as CacheEntry | undefined;
                resolve(entry ? entry.blob : null);
            };
        });
    },

    async remove(fileId: string): Promise<void> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const request = store.delete(fileId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    /**
     * Clear all cached backgrounds.
     * Called during logout to ensure no user data persists.
     */
    async clearAll(): Promise<void> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
};

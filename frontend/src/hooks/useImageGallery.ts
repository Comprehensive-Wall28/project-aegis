import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAndDecryptFile } from './useVaultDownload';
import { useSessionStore } from '../stores/sessionStore';
import { type FileMetadata } from '../services/vaultService';

// Cache window size - how many images to keep in memory around current index
const CACHE_WINDOW = 3;

interface CacheEntry {
    blobUrl: string;
    error: string | null;
}

/**
 * Hook for managing an encrypted image gallery with caching and preloading.
 * 
 * @param files - Array of file metadata for the gallery
 * @param currentIndex - Currently displayed image index
 * @param isOpen - Whether the gallery is currently open/visible
 */
export const useImageGallery = (
    files: FileMetadata[],
    currentIndex: number,
    isOpen: boolean
) => {
    const { user, vaultCtrKey, setCryptoStatus } = useSessionStore();
    const vaultKey = user?.vaultKey;


    // Cache: fileId -> { blobUrl, error }
    const cacheRef = useRef<Record<string, CacheEntry>>({});

    // Track in-flight requests
    const pendingRef = useRef<Set<string>>(new Set());

    // Track the expected file ID to prevent stale updates
    const expectedFileIdRef = useRef<string | null>(null);

    // State for current image
    const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper: Load a single image and cache it
    const loadImageIntoCache = useCallback(async (
        file: FileMetadata,
        isHighPriority: boolean = false
    ): Promise<CacheEntry | null> => {
        const fileId = file._id;

        // Return cached entry if available
        if (cacheRef.current[fileId]?.blobUrl) {
            return cacheRef.current[fileId];
        }

        // Skip if already loading
        if (pendingRef.current.has(fileId)) {
            return null;
        }

        if (!vaultCtrKey || !vaultKey) {
            return null;
        }

        // Mark as pending
        pendingRef.current.add(fileId);

        if (isHighPriority) {
            setCryptoStatus('decrypting');
        }

        try {
            const privateKey = user?.privateKey;
            const blob = await fetchAndDecryptFile(file, { vaultCtrKey, vaultKey: vaultKey as CryptoKey, privateKey });


            const blobUrl = URL.createObjectURL(blob);
            const entry: CacheEntry = { blobUrl, error: null };
            cacheRef.current[fileId] = entry;
            return entry;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to decrypt image';
            const entry: CacheEntry = { blobUrl: '', error: errorMsg };
            cacheRef.current[fileId] = entry;
            console.error(`Failed to load image ${fileId}:`, err);
            return entry;
        } finally {
            pendingRef.current.delete(fileId);
            if (isHighPriority) {
                setCryptoStatus('idle');
            }
        }
    }, [vaultCtrKey, setCryptoStatus]);

    // Cleanup Object URLs outside the cache window
    const cleanupOutsideWindow = useCallback((centerIndex: number) => {
        const validFileIds = new Set<string>();

        for (let i = centerIndex - CACHE_WINDOW; i <= centerIndex + CACHE_WINDOW; i++) {
            if (i >= 0 && i < files.length) {
                validFileIds.add(files[i]._id);
            }
        }

        Object.keys(cacheRef.current).forEach(fileId => {
            if (!validFileIds.has(fileId)) {
                const entry = cacheRef.current[fileId];
                if (entry.blobUrl) {
                    URL.revokeObjectURL(entry.blobUrl);
                }
                delete cacheRef.current[fileId];
            }
        });
    }, [files]);

    // Single unified effect for loading and state management
    useEffect(() => {
        if (!isOpen || files.length === 0 || currentIndex < 0 || currentIndex >= files.length) {
            expectedFileIdRef.current = null;
            setCurrentBlobUrl(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        const currentFile = files[currentIndex];
        const currentFileId = currentFile._id;

        // Set expected file ID for this effect run
        expectedFileIdRef.current = currentFileId;

        // Check if already cached
        const cached = cacheRef.current[currentFileId];
        if (cached?.blobUrl) {
            setCurrentBlobUrl(cached.blobUrl);
            setIsLoading(false);
            setError(null);
            // Preload adjacent
            preloadAdjacent();
            cleanupOutsideWindow(currentIndex);
            return;
        }

        if (cached?.error) {
            setCurrentBlobUrl(null);
            setIsLoading(false);
            setError(cached.error);
            return;
        }

        // Need to load - show loading state
        setCurrentBlobUrl(null);
        setIsLoading(true);
        setError(null);

        // Load the image
        loadImageIntoCache(currentFile, true).then((entry) => {
            // CRITICAL: Only update state if this is still the expected file
            if (expectedFileIdRef.current !== currentFileId) {
                return;
            }

            if (entry?.blobUrl) {
                setCurrentBlobUrl(entry.blobUrl);
                setIsLoading(false);
                setError(null);
            } else if (entry?.error) {
                setCurrentBlobUrl(null);
                setIsLoading(false);
                setError(entry.error);
            }
            // Note: if entry is null, it means it's already pending.
            // The loading state is already true, and the polling effect 
            // below will handle the resolution.

            preloadAdjacent();
        });

        cleanupOutsideWindow(currentIndex);

        // Preload adjacent images
        async function preloadAdjacent() {
            if (expectedFileIdRef.current !== currentFileId) return;

            if (currentIndex < files.length - 1) {
                await loadImageIntoCache(files[currentIndex + 1], false);
            }
            if (currentIndex > 0) {
                await loadImageIntoCache(files[currentIndex - 1], false);
            }
        }

    }, [isOpen, files, currentIndex, loadImageIntoCache, cleanupOutsideWindow]);

    // Poll for pending loads to complete (handles the case where we're waiting for a load started by another index)
    useEffect(() => {
        if (!isOpen || !isLoading) return;

        const currentFileId = files[currentIndex]?._id;
        if (!currentFileId) return;

        // If the file is currently pending, set up a polling interval to check when it completes
        const intervalId = setInterval(() => {
            const cached = cacheRef.current[currentFileId];
            if (cached?.blobUrl && expectedFileIdRef.current === currentFileId) {
                setCurrentBlobUrl(cached.blobUrl);
                setIsLoading(false);
                setError(null);
            } else if (cached?.error && expectedFileIdRef.current === currentFileId) {
                setCurrentBlobUrl(null);
                setIsLoading(false);
                setError(cached.error);
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, [isOpen, isLoading, files, currentIndex]);

    // Cleanup when unmounting
    useEffect(() => {
        return () => {
            Object.values(cacheRef.current).forEach(entry => {
                if (entry.blobUrl) {
                    URL.revokeObjectURL(entry.blobUrl);
                }
            });
            cacheRef.current = {};
            pendingRef.current.clear();
        };
    }, []);

    // Cleanup when gallery closes
    useEffect(() => {
        if (!isOpen) {
            Object.values(cacheRef.current).forEach(entry => {
                if (entry.blobUrl) {
                    URL.revokeObjectURL(entry.blobUrl);
                }
            });
            cacheRef.current = {};
            pendingRef.current.clear();
            expectedFileIdRef.current = null;
            setCurrentBlobUrl(null);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen]);

    return {
        currentBlobUrl,
        isLoading,
        error,
    };
};

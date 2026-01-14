import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAndDecryptFile } from './useVaultDownload';
import { useSessionStore } from '../stores/sessionStore';
import { type FileMetadata } from '../services/vaultService';

// Cache window size - how many images to keep in memory around current index
const CACHE_WINDOW = 2;

interface ImageGalleryState {
    currentBlobUrl: string | null;
    isLoading: boolean;
    error: string | null;
}

interface CacheEntry {
    blobUrl: string;
    loading: boolean;
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
    const { vaultCtrKey, setCryptoStatus } = useSessionStore();

    // Cache: fileId -> { blobUrl, loading, error }
    const cacheRef = useRef<Record<string, CacheEntry>>({});

    // Track in-flight requests to prevent duplicates
    const pendingRef = useRef<Set<string>>(new Set());

    // State for current image
    const [state, setState] = useState<ImageGalleryState>({
        currentBlobUrl: null,
        isLoading: false,
        error: null,
    });

    // Helper: Load a single image and cache it
    const loadImage = useCallback(async (
        file: FileMetadata,
        isHighPriority: boolean = false
    ): Promise<string | null> => {
        const fileId = file._id;

        // Return cached URL if available
        if (cacheRef.current[fileId]?.blobUrl) {
            return cacheRef.current[fileId].blobUrl;
        }

        // Skip if already loading
        if (pendingRef.current.has(fileId)) {
            return null;
        }

        if (!vaultCtrKey) {
            return null;
        }

        // Mark as pending
        pendingRef.current.add(fileId);
        cacheRef.current[fileId] = { blobUrl: '', loading: true, error: null };

        if (isHighPriority) {
            setCryptoStatus('decrypting');
        }

        try {
            const blob = await fetchAndDecryptFile(
                file,
                { vaultCtrKey }
            );

            const blobUrl = URL.createObjectURL(blob);
            cacheRef.current[fileId] = { blobUrl, loading: false, error: null };

            return blobUrl;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to decrypt image';
            cacheRef.current[fileId] = { blobUrl: '', loading: false, error: errorMsg };
            console.error(`Failed to load image ${fileId}:`, err);
            return null;
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

        // Build set of file IDs that should be kept (within ±CACHE_WINDOW)
        for (let i = centerIndex - CACHE_WINDOW; i <= centerIndex + CACHE_WINDOW; i++) {
            if (i >= 0 && i < files.length) {
                validFileIds.add(files[i]._id);
            }
        }

        // Revoke and remove URLs outside the window
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

    // Main effect: Load current image and preload adjacent (chained to avoid blocking HTTP connections)
    useEffect(() => {
        if (!isOpen || files.length === 0 || currentIndex < 0 || currentIndex >= files.length) {
            setState({ currentBlobUrl: null, isLoading: false, error: null });
            return;
        }

        let isCancelled = false;
        const currentFile = files[currentIndex];
        const currentFileId = currentFile._id;

        // Check if current image is already cached
        const cached = cacheRef.current[currentFileId];
        if (cached?.blobUrl) {
            setState({
                currentBlobUrl: cached.blobUrl,
                isLoading: false,
                error: null,
            });
            // Preload adjacent images in background (chained)
            preloadAdjacentChained();
            return;
        }

        // Check if there's an error cached
        if (cached?.error) {
            setState({
                currentBlobUrl: null,
                isLoading: false,
                error: cached.error,
            });
            return;
        }

        // Load current image (high priority)
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        loadImage(currentFile, true).then(blobUrl => {
            if (isCancelled) return;

            if (blobUrl) {
                setState({
                    currentBlobUrl: blobUrl,
                    isLoading: false,
                    error: null,
                });
                // Preload adjacent after current loads (chained)
                preloadAdjacentChained();
            } else {
                // Check if still loading (pending) - if so, don't show error yet
                if (pendingRef.current.has(currentFileId)) {
                    // Still loading, keep the loading state
                    return;
                }

                const cachedEntry = cacheRef.current[currentFileId];
                // Only show error if there's an actual error cached
                if (cachedEntry?.error) {
                    setState({
                        currentBlobUrl: null,
                        isLoading: false,
                        error: cachedEntry.error,
                    });
                }
                // Otherwise keep loading state - the image might be loaded by another effect run
            }
        });

        // Cleanup images outside the cache window
        cleanupOutsideWindow(currentIndex);

        // Preload adjacent images sequentially: Next -> Previous
        // This chains the promises to avoid blocking concurrent HTTP connections
        async function preloadAdjacentChained() {
            if (isCancelled) return;

            // Load next image first (more likely to be needed)
            if (currentIndex < files.length - 1) {
                const nextFile = files[currentIndex + 1];
                await loadImage(nextFile, false);
            }

            if (isCancelled) return;

            // Then load previous image
            if (currentIndex > 0) {
                const prevFile = files[currentIndex - 1];
                await loadImage(prevFile, false);
            }
        }

        return () => {
            isCancelled = true;
        };
    }, [isOpen, files, currentIndex, loadImage, cleanupOutsideWindow]);

    // Cleanup all Object URLs when gallery closes or unmounts
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
            setState({ currentBlobUrl: null, isLoading: false, error: null });
        }
    }, [isOpen]);

    return {
        currentBlobUrl: state.currentBlobUrl,
        isLoading: state.isLoading,
        error: state.error,
    };
};

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseLazyLoadOptions {
    /** Number of items to load initially and per batch */
    batchSize?: number;
    /** Root margin for intersection observer (loads items before they're visible) */
    rootMargin?: string;
}

interface UseLazyLoadResult<T> {
    /** Currently visible items (paginated subset) */
    visibleItems: T[];
    /** Whether there are more items to load */
    hasMore: boolean;
    /** Ref to attach to the sentinel element */
    sentinelRef: React.RefCallback<HTMLElement>;
    /** Reset pagination (call when data changes) */
    reset: () => void;
    /** Total count of all items */
    totalCount: number;
    /** Currently loaded count */
    loadedCount: number;
}

/**
 * Hook for lazy loading / infinite scroll with Intersection Observer
 * Progressively reveals items as user scrolls, reducing initial render cost
 */
export function useLazyLoad<T>(
    items: T[],
    options: UseLazyLoadOptions = {}
): UseLazyLoadResult<T> {
    const { batchSize = 24, rootMargin = '200px' } = options;

    const [loadedCount, setLoadedCount] = useState(batchSize);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelNodeRef = useRef<HTMLElement | null>(null);

    // Reset when items array reference changes (new folder, search, etc.)
    useEffect(() => {
        setLoadedCount(batchSize);
    }, [items, batchSize]);

    const loadMore = useCallback(() => {
        setLoadedCount(prev => Math.min(prev + batchSize, items.length));
    }, [batchSize, items.length]);

    // Intersection Observer callback
    const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
            loadMore();
        }
    }, [loadMore]);

    // Ref callback for the sentinel element
    const sentinelRef = useCallback((node: HTMLElement | null) => {
        // Cleanup previous observer
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        sentinelNodeRef.current = node;

        if (node) {
            observerRef.current = new IntersectionObserver(handleIntersect, {
                rootMargin,
                threshold: 0,
            });
            observerRef.current.observe(node);
        }
    }, [handleIntersect, rootMargin]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    const visibleItems = items.slice(0, loadedCount);
    const hasMore = loadedCount < items.length;

    const reset = useCallback(() => {
        setLoadedCount(batchSize);
    }, [batchSize]);

    return {
        visibleItems,
        hasMore,
        sentinelRef,
        reset,
        totalCount: items.length,
        loadedCount,
    };
}

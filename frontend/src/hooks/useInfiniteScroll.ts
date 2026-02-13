import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook for infinite scroll with Intersection Observer.
 * Calls onLoadMore when the sentinel element becomes visible.
 */
export function useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore,
    rootMargin = '400px'
}: {
    hasMore: boolean;
    isLoading: boolean;
    onLoadMore: () => void;
    rootMargin?: string;
}) {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelNodeRef = useRef<HTMLElement | null>(null);

    const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
            onLoadMore();
        }
    }, [hasMore, isLoading, onLoadMore]);

    const sentinelRef = useCallback((node: HTMLElement | null) => {
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

    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    return { sentinelRef };
}

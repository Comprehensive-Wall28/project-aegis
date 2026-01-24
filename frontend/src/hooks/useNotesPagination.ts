import { useState, useCallback, useRef } from 'react';
import noteService, { type NoteMetadata } from '../services/noteService';

export const useNotesPagination = (
    setNotes: React.Dispatch<React.SetStateAction<NoteMetadata[]>>,
    selectedFolderId: string | null,
    selectedTags: string[],
    decryptTitles: (notes: NoteMetadata[]) => Promise<void>
) => {
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const lastFetchedCursorRef = useRef<string | null>(null);
    const limit = 20;

    const loadMore = useCallback(async () => {
        if (isFetchingMore || !hasMore || !cursor || cursor === lastFetchedCursorRef.current) return;

        try {
            setIsFetchingMore(true);
            lastFetchedCursorRef.current = cursor;

            const response = await noteService.getNotesPaginated({
                limit,
                cursor: cursor || undefined,
                folderId: selectedFolderId || undefined,
                tags: selectedTags.length > 0 ? selectedTags : undefined
            });

            setNotes(prev => {
                const existingIds = new Set(prev.map(n => n._id));
                const newItems = response.items.filter(n => !existingIds.has(n._id));
                return [...prev, ...newItems];
            });

            setCursor(response.nextCursor);
            setHasMore(!!response.nextCursor);

            // Trigger decryption for new notes
            decryptTitles(response.items);
        } catch (err) {
            console.error('Failed to load more notes:', err);
        } finally {
            setIsFetchingMore(false);
        }
    }, [isFetchingMore, hasMore, cursor, selectedFolderId, selectedTags, setNotes, decryptTitles]);

    const resetPagination = useCallback(() => {
        setCursor(null);
        setHasMore(false);
        setIsFetchingMore(false);
        lastFetchedCursorRef.current = null;
    }, []);

    const setPaginationState = useCallback((nextCursor: string | null) => {
        setCursor(nextCursor);
        setHasMore(!!nextCursor);
        // If we just got a new cursor from loadData, reset the tracking
        lastFetchedCursorRef.current = null;
    }, []);

    return {
        hasMore,
        isFetchingMore,
        loadMore,
        resetPagination,
        setPaginationState
    };
};

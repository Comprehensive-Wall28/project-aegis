import { useState, useEffect, useRef, useMemo } from 'react';
import type { NoteMetadata } from '../services/noteService';

export const useNotesSearch = (
    notes: NoteMetadata[],
    decryptedTitles: Record<string, string>,
    selectedFolderId: string | null,
    selectedTags: string[]
) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredIds, setFilteredIds] = useState<string[]>([]); // Default to empty to avoid showing all notes
    const [isFiltering, setIsFiltering] = useState(true);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker(new URL('../workers/search.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e) => {
            const { type, results } = e.data;
            if (type === 'SEARCH_RESULTS') {
                setFilteredIds(results);
                setIsFiltering(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // Update worker data when notes or titles change
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'UPDATE_DATA',
                payload: { notes, decryptedTitles }
            });

            // Trigger search/filter after data update
            setIsFiltering(true);
            workerRef.current.postMessage({
                type: 'SEARCH',
                payload: {
                    query: searchQuery,
                    folderId: selectedFolderId,
                    tags: selectedTags
                }
            });
        }
    }, [notes, decryptedTitles]);

    // Trigger search/filter when query or filters change
    useEffect(() => {
        if (workerRef.current) {
            setIsFiltering(true);
            workerRef.current.postMessage({
                type: 'SEARCH',
                payload: {
                    query: searchQuery,
                    folderId: selectedFolderId,
                    tags: selectedTags
                }
            });
        }
    }, [searchQuery, selectedFolderId, selectedTags]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        // useEffect will trigger the worker message
    };

    const filteredNotes = useMemo(() => {
        // If we are filtering, maybe we should return empty or previous results?
        // Using a Set for O(1) lookup
        const idSet = new Set(filteredIds);

        if (searchQuery) {
            // Map IDs back to note objects to preserve order
            return filteredIds
                .map(id => notes.find(n => n._id === id))
                .filter((n): n is NoteMetadata => n !== undefined);
        } else {
            return notes.filter(n => idSet.has(n._id));
        }
    }, [notes, filteredIds, searchQuery]);

    return {
        searchQuery,
        setSearchQuery: handleSearch,
        filteredNotes,
        isFiltering
    };
};

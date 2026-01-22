import { useState, useEffect, useRef, useMemo } from 'react';
import type { NoteMetadata } from '../services/noteService';

export const useNotesSearch = (notes: NoteMetadata[], decryptedTitles: Record<string, string>) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredIds, setFilteredIds] = useState<string[] | null>(null);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker(new URL('../workers/search.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e) => {
            const { type, results } = e.data;
            if (type === 'SEARCH_RESULTS') {
                setFilteredIds(results);
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

            // Re-run search if there is an active query, to update results with new data
            if (searchQuery) {
                workerRef.current.postMessage({
                    type: 'SEARCH',
                    payload: { query: searchQuery }
                });
            }
        }
    }, [notes, decryptedTitles, searchQuery]); // Added searchQuery to ensure consistency

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'SEARCH',
                payload: { query }
            });
        }
    };

    const filteredNotes = useMemo(() => {
        if (!searchQuery || filteredIds === null) return notes;
        const idSet = new Set(filteredIds);
        return notes.filter(n => idSet.has(n._id));
    }, [notes, filteredIds, searchQuery]);

    return {
        searchQuery,
        setSearchQuery: handleSearch,
        filteredNotes
    };
};

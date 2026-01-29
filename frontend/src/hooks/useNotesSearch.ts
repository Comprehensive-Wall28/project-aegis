import { useState, useEffect, useRef, useMemo } from 'react';
import type { NoteMetadata } from '../services/noteService';

export const useNotesSearch = (
    notes: NoteMetadata[],
    decryptedTitles: Map<string, string>,
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

    const prevNotesRef = useRef<NoteMetadata[]>([]);
    const prevTitlesRef = useRef<Map<string, string>>(new Map());
    const isInitialLoadRef = useRef(true);

    // Update worker data when notes or titles change (Delta updates)
    useEffect(() => {
        if (!workerRef.current) return;

        if (isInitialLoadRef.current && notes.length > 0) {
            workerRef.current.postMessage({
                type: 'UPDATE_DATA',
                payload: { notes, decryptedTitles }
            });
            isInitialLoadRef.current = false;
        } else {
            // Check for deleted notes
            const currentIds = new Set(notes.map(n => n._id));
            prevNotesRef.current.forEach(prevNote => {
                if (!currentIds.has(prevNote._id)) {
                    workerRef.current?.postMessage({
                        type: 'DELETE_NOTE',
                        payload: { id: prevNote._id }
                    });
                }
            });

            // Check for updated or new notes
            notes.forEach(note => {
                const prevNote = prevNotesRef.current.find(pn => pn._id === note._id);
                const prevTitle = prevTitlesRef.current.get(note._id);
                const currentTitle = decryptedTitles.get(note._id) || 'Untitled Note';

                const hasChanged = !prevNote ||
                    prevNote.updatedAt !== note.updatedAt ||
                    prevNote.noteFolderId !== note.noteFolderId ||
                    prevNote.tags.length !== note.tags.length ||
                    !note.tags.every((t, i) => t === prevNote.tags[i]) ||
                    prevTitle !== currentTitle;

                if (hasChanged) {
                    workerRef.current?.postMessage({
                        type: 'UPDATE_NOTE',
                        payload: { note, decryptedTitle: currentTitle }
                    });
                }
            });
        }

        prevNotesRef.current = notes;
        prevTitlesRef.current = new Map(decryptedTitles);

        // Trigger search after delta updates
        workerRef.current.postMessage({
            type: 'SEARCH',
            payload: {
                query: searchQuery,
                folderId: selectedFolderId,
                tags: selectedTags
            }
        });
    }, [notes, decryptedTitles]);

    // Trigger search/filter when query or filters change
    useEffect(() => {
        if (!workerRef.current) return;

        // Set filtering state immediately to avoid showing empty list flicker
        const timer = setTimeout(() => {
            setIsFiltering(true);
            workerRef.current?.postMessage({
                type: 'SEARCH',
                payload: {
                    query: searchQuery,
                    folderId: selectedFolderId,
                    tags: selectedTags
                }
            });
        }, 150); // Small debounce for typing, but UI state updated immediately

        return () => clearTimeout(timer);
    }, [searchQuery, selectedFolderId, selectedTags, notes, decryptedTitles]);

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

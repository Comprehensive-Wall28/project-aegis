import { useState, useCallback, useEffect, useRef } from 'react';
import noteService from '../services/noteService';
import type { NoteMetadata, NoteFolder } from '../services/noteService';
import { useSessionStore } from '../stores/sessionStore';
import { useNoteEncryption } from './useNoteEncryption';
import type { NoteContent } from './useNoteEncryption';
import type { JSONContent } from '@tiptap/react';

export interface DecryptedNote {
    metadata: NoteMetadata;
    content: NoteContent | null;
}

export const useNotesData = () => {
    const { pqcEngineStatus } = useSessionStore();
    const {
        decryptString,
        deriveAesKey,
        encryptNote,
        generateNoteHash,
        decryptNoteContent
    } = useNoteEncryption();

    const [notes, setNotes] = useState<NoteMetadata[]>([]);
    const [folders, setFolders] = useState<NoteFolder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userTags, setUserTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [decryptedTitles, setDecryptedTitles] = useState<Map<string, string>>(new Map());
    const decryptedTitlesRef = useRef<Map<string, string>>(new Map());
    const activeNoteIdRef = useRef<string | null>(null);
    const fetchAbortControllerRef = useRef<AbortController | null>(null);

    // Decrypt note titles
    const decryptTitles = useCallback(async (notesToDecrypt: NoteMetadata[]) => {
        if (pqcEngineStatus !== 'operational') return;

        const currentMap = decryptedTitlesRef.current;
        const newTitles = new Map<string, string>();
        let changed = false;

        for (const note of notesToDecrypt) {
            // Check ref to see if we already have it (blocking re-renders)
            if (note.encryptedTitle && !currentMap.has(note._id)) {
                try {
                    const aesKey = await deriveAesKey(note.encapsulatedKey, note.encryptedSymmetricKey);
                    const title = await decryptString(note.encryptedTitle, aesKey);
                    newTitles.set(note._id, title);
                    currentMap.set(note._id, title); // Update ref immediately
                    changed = true;
                } catch (err) {
                    console.error('Failed to decrypt title for note:', note._id, err);
                    const title = 'Untitled Note';
                    newTitles.set(note._id, title);
                    currentMap.set(note._id, title);
                    changed = true;
                }
            } else if (!note.encryptedTitle && !currentMap.has(note._id)) {
                const title = 'Untitled Note';
                newTitles.set(note._id, title);
                currentMap.set(note._id, title);
                changed = true;
            }
        }

        if (changed) {
            // Merge new titles into a NEW Map to trigger state update
            setDecryptedTitles(prev => {
                const updated = new Map(prev);
                newTitles.forEach((value, key) => updated.set(key, value));
                return updated;
            });
        }
    }, [deriveAesKey, decryptString, pqcEngineStatus]); // Removed decryptedTitles from dependency array 
    // Optimization: avoid re-running if keys already exist.
    // However, existing code had this. I'll stick to logic but maybe Ref is better for accumulated titles.

    // Load notes and folders
    const loadData = useCallback(async () => {
        try {
            if (notes.length === 0) {
                setIsLoading(true);
            } else {
                setIsRefreshing(true);
            }

            setError(null);
            const [notesList, foldersList, tags] = await Promise.all([
                noteService.getNotes({}), // Fetch all notes for global search
                noteService.getFolders(),
                noteService.getUserTags(),
            ]);

            setNotes(notesList);
            setFolders(foldersList);
            setUserTags(tags);

            // Start decrypting titles in background if engine is ready
            if (pqcEngineStatus === 'operational') {
                decryptTitles(notesList);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [decryptTitles, pqcEngineStatus, notes.length]);

    // Retry decryption when PQC engine becomes operational
    useEffect(() => {
        if (pqcEngineStatus === 'operational' && notes.length > 0) {
            decryptTitles(notes);
        }
    }, [pqcEngineStatus, notes, decryptTitles]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateNote = useCallback(async () => {
        try {
            setError(null);
            const emptyContent: NoteContent = {
                type: 'doc',
                content: [{ type: 'paragraph' }],
            };

            const encrypted = await encryptNote(emptyContent, 'New Note');
            const recordHash = await generateNoteHash(emptyContent, [], 'New Note');

            const newNote = await noteService.createNote({
                ...encrypted,
                noteFolderId: selectedFolderId || undefined,
                recordHash,
                tags: [],
            });

            setNotes(prev => [newNote, ...prev]);

            const title = 'New Note';
            decryptedTitlesRef.current.set(newNote._id, title);
            setDecryptedTitles(prev => {
                const next = new Map(prev);
                next.set(newNote._id, title);
                return next;
            });
            setSelectedNote({
                metadata: newNote,
                content: emptyContent,
            });
            return newNote;
        } catch (err: any) {
            setError(err.message || 'Failed to create note');
            throw err;
        }
    }, [encryptNote, generateNoteHash, selectedFolderId]);

    const handleSelectNote = useCallback(async (note: NoteMetadata) => {
        // Update the active note reference immediately
        activeNoteIdRef.current = note._id;

        if (selectedNote?.metadata._id === note._id) {
            return;
        }

        // Optimistic update: Show loading state immediately for specific note
        setSelectedNote({
            metadata: note,
            content: null // Content is null while loading
        });

        // Abort previous request if it exists
        if (fetchAbortControllerRef.current) {
            fetchAbortControllerRef.current.abort();
        }

        // Create new controller for this request
        const abortController = new AbortController();
        fetchAbortControllerRef.current = abortController;

        try {
            setIsLoadingContent(true);
            setError(null);

            const contentResponse = await noteService.getNoteContent(note._id, {
                signal: abortController.signal
            });

            // Race condition check: active note changed while fetching
            if (activeNoteIdRef.current !== note._id) {
                return;
            }

            const decryptedContent = await decryptNoteContent(
                contentResponse.encryptedContent,
                contentResponse.encapsulatedKey,
                contentResponse.encryptedSymmetricKey
            );

            // Race condition check: active note changed while decrypting
            if (activeNoteIdRef.current !== note._id) {
                return;
            }

            setSelectedNote({
                metadata: note,
                content: decryptedContent,
            });
        } catch (err: any) {
            // Ignore abort errors
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                return;
            }

            // Only set error if we are still on the same note
            if (activeNoteIdRef.current === note._id) {
                console.error('Failed to load note content:', err);
                setError(err.message || 'Failed to load note content');
            }
        } finally {
            // Only stop loading if we are still on the same note
            if (activeNoteIdRef.current === note._id) {
                setIsLoadingContent(false);
            }
            // Cleanup controller ref if it's still this one
            if (fetchAbortControllerRef.current === abortController) {
                fetchAbortControllerRef.current = null;
            }
        }
    }, [selectedNote, decryptNoteContent]);

    const handleSaveContent = useCallback(async (content: JSONContent, title?: string) => {
        if (!selectedNote) return;

        try {
            const noteContent = content as NoteContent;
            const currentTitle = title !== undefined ? title : (decryptedTitles.get(selectedNote.metadata._id) || 'Untitled Note');

            // Use encryptNote to get both content and title encrypted with the same new keys
            const encrypted = await encryptNote(noteContent, currentTitle);

            const recordHash = await generateNoteHash(
                noteContent,
                selectedNote.metadata.tags,
                currentTitle
            );

            const updatedNote = await noteService.updateNoteContent(selectedNote.metadata._id, {
                ...encrypted,
                recordHash,
            });

            const finalNote = updatedNote;
            if (title !== undefined) {
                decryptedTitlesRef.current.set(finalNote._id, title);
                setDecryptedTitles(prev => {
                    const next = new Map(prev);
                    next.set(finalNote._id, title);
                    return next;
                });
            }

            setSelectedNote(prev => prev ? {
                ...prev,
                metadata: finalNote,
                content: noteContent,
            } : null);

            // Update notes list metadata
            setNotes(prev => prev.map(n =>
                n._id === finalNote._id ? finalNote : n
            ));
        } catch (err: any) {
            console.error('Failed to save note:', err);
            throw err;
        }
    }, [selectedNote, encryptNote, generateNoteHash, decryptedTitles]);

    const createFolder = useCallback(async (name: string) => {
        try {
            const newFolder = await noteService.createFolder({ name });
            setFolders(prev => [...prev, newFolder]);
            return newFolder;
        } catch (err: any) {
            setError(err.message || 'Failed to create folder');
            throw err;
        }
    }, []);

    const updateFolder = useCallback(async (id: string, name: string) => {
        try {
            const updatedFolder = await noteService.updateFolder(id, { name });
            setFolders(prev => prev.map(f => f._id === id ? updatedFolder : f));
        } catch (err: any) {
            setError(err.message || 'Failed to update folder');
            throw err;
        }
    }, []);

    const deleteFolder = useCallback(async (id: string) => {
        try {
            await noteService.deleteFolder(id);
            setFolders(prev => prev.filter(f => f._id !== id));
            if (selectedFolderId === id) setSelectedFolderId(null);
            loadData(); // Reload notes as they might have moved
        } catch (err: any) {
            setError(err.message || 'Failed to delete folder');
            throw err;
        }
    }, [selectedFolderId, loadData]);

    const deleteNote = useCallback(async (id: string) => {
        try {
            await noteService.deleteNote(id);
            setNotes(prev => prev.filter(n => n._id !== id));

            // Prune cache
            if (decryptedTitlesRef.current.has(id)) {
                decryptedTitlesRef.current.delete(id);
                setDecryptedTitles(prev => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
            }
            if (selectedNote?.metadata._id === id) {
                setSelectedNote(null);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete note');
            throw err;
        }
    }, [selectedNote]);

    const moveNote = useCallback(async (noteId: string, folderId: string | null) => {
        try {
            await noteService.updateNoteMetadata(noteId, {
                noteFolderId: folderId || undefined
            });

            // Update local state
            setNotes(prev => prev.map(n =>
                n._id === noteId ? { ...n, noteFolderId: folderId || undefined } : n
            ));

            // If the note was selected, update its metadata
            if (selectedNote?.metadata._id === noteId) {
                setSelectedNote(prev => prev ? {
                    ...prev,
                    metadata: { ...prev.metadata, noteFolderId: folderId || undefined }
                } : null);
            }

            // We don't remove it from 'notes' anymore because 'notes' is global state.
            // The search worker will filter it out of the view based on 'folderId'.

        } catch (err: any) {
            setError(err.message || 'Failed to move note');
            throw err;
        }
    }, [selectedFolderId, selectedNote]);

    return {
        notes,
        folders,
        selectedFolderId,
        setSelectedFolderId,
        selectedNote,
        setSelectedNote,
        isLoading,
        isRefreshing,
        isLoadingContent,
        error,
        userTags,
        selectedTags,
        setSelectedTags,
        decryptedTitles,
        handleCreateNote,
        handleSelectNote,
        handleSaveContent,
        createFolder,
        updateFolder,
        deleteFolder,
        deleteNote,
        moveNote,
        setNotes // Exporting this for optimistic updates or drag drop if needed
    };
};

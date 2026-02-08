import { useState, useCallback, useRef } from 'react';
import noteService, { type NoteMetadata } from '../services/noteService';
import { useNoteEncryption, type NoteContent } from './useNoteEncryption';
import { type JSONContent } from '@tiptap/react';

export interface DecryptedNote {
    metadata: NoteMetadata;
    content: NoteContent | null;
}

export const useNotesCrud = (
    setNotes: React.Dispatch<React.SetStateAction<NoteMetadata[]>>,
    selectedFolderId: string | null,
    decryptedTitles: Map<string, string>,
    setDecryptedTitles: React.Dispatch<React.SetStateAction<Map<string, string>>>,
    decryptedTitlesRef: React.MutableRefObject<Map<string, string>>
) => {
    const {
        encryptNote,
        generateNoteHash,
        decryptNoteContent
    } = useNoteEncryption();

    const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeNoteIdRef = useRef<string | null>(null);
    const fetchAbortControllerRef = useRef<AbortController | null>(null);

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
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message || 'Failed to create note');
            throw err;
        }
    }, [encryptNote, generateNoteHash, selectedFolderId, setNotes, setDecryptedTitles, decryptedTitlesRef]);

    const handleSelectNote = useCallback(async (note: NoteMetadata) => {
        activeNoteIdRef.current = note._id;

        if (selectedNote?.metadata._id === note._id) {
            return;
        }

        setSelectedNote({
            metadata: note,
            content: null
        });

        if (fetchAbortControllerRef.current) {
            fetchAbortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        fetchAbortControllerRef.current = abortController;

        try {
            setIsLoadingContent(true);
            setError(null);

            const contentResponse = await noteService.getNoteContent(note._id, {
                signal: abortController.signal
            });

            if (activeNoteIdRef.current !== note._id) return;

            const decryptedContent = await decryptNoteContent(
                contentResponse.encryptedContent,
                contentResponse.encapsulatedKey,
                contentResponse.encryptedSymmetricKey
            );

            if (activeNoteIdRef.current !== note._id) return;

            setSelectedNote({
                metadata: note,
                content: decryptedContent,
            });
        } catch (err: unknown) {
            const error = err as { name?: string; code?: string };
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;

            if (activeNoteIdRef.current === note._id) {
                const error = err as { message?: string };
                console.error('Failed to load note content:', err);
                setError(error.message || 'Failed to load note content');
            }
        } finally {
            if (activeNoteIdRef.current === note._id) {
                setIsLoadingContent(false);
            }
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

            const encrypted = await encryptNote(noteContent, currentTitle);
            const recordHash = await generateNoteHash(
                noteContent,
                selectedNote.metadata.tags,
                currentTitle
            );

            const finalNote = await noteService.updateNoteContent(selectedNote.metadata._id, {
                ...encrypted,
                recordHash,
            });

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

            setNotes(prev => prev.map(n => n._id === finalNote._id ? finalNote : n));
        } catch (err: unknown) {
            console.error('Failed to save note:', err);
            throw err;
        }
    }, [selectedNote, encryptNote, generateNoteHash, decryptedTitles, setNotes, setDecryptedTitles, decryptedTitlesRef]);

    const deleteNote = useCallback(async (id: string) => {
        try {
            await noteService.deleteNote(id);
            setNotes(prev => prev.filter(n => n._id !== id));

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
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message || 'Failed to delete note');
            throw err;
        }
    }, [selectedNote, setNotes, setDecryptedTitles, decryptedTitlesRef]);

    const moveNote = useCallback(async (noteId: string, folderId: string | null) => {
        try {
            await noteService.updateNoteMetadata(noteId, {
                noteFolderId: folderId || undefined
            });

            setNotes(prev => {
                // If we are in a specific folder and the note moved OUT of it, remove it
                if (selectedFolderId && folderId !== selectedFolderId) {
                    return prev.filter(n => n._id !== noteId);
                }
                // Otherwise update its folder ID
                return prev.map(n =>
                    n._id === noteId ? { ...n, noteFolderId: folderId || undefined } : n
                );
            });

            if (selectedNote?.metadata._id === noteId) {
                setSelectedNote(prev => prev ? {
                    ...prev,
                    metadata: { ...prev.metadata, noteFolderId: folderId || undefined }
                } : null);
            }
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message || 'Failed to move note');
            throw err;
        }
    }, [selectedNote, setNotes, selectedFolderId]);

    return {
        selectedNote,
        setSelectedNote,
        isLoadingContent,
        error,
        setError,
        handleCreateNote,
        handleSelectNote,
        handleSaveContent,
        deleteNote,
        moveNote
    };
};

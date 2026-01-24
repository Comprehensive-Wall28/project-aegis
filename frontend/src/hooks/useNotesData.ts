import { useState, useCallback, useEffect } from 'react';
import noteService, { type NoteMetadata } from '../services/noteService';
import { useSessionStore } from '../stores/sessionStore';
import { useNotesMetadata } from './useNotesMetadata';
import { useNotesAutoDecrypt } from './useNotesAutoDecrypt';
import { useNotesCrud } from './useNotesCrud';
import { useNotesPagination } from './useNotesPagination';

const arraysEqual = (a: any[], b: any[]) =>
    a.length === b.length && a.every((val, index) => val === b[index]);

export const useNotesData = () => {
    const { pqcEngineStatus } = useSessionStore();

    const [notes, setNotes] = useState<NoteMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // 1. Metadata Hook
    const metadata = useNotesMetadata();
    const {
        folders, setFolders, setUserTags,
        selectedFolderId, setSelectedFolderId,
        selectedTags, setSelectedTags,
        error: metadataError, setError: setMetadataError
    } = metadata;

    // Track last search params to detect changes synchronously during render
    const [lastParams, setLastParams] = useState({ folderId: selectedFolderId, tags: selectedTags });

    if (lastParams.folderId !== selectedFolderId || !arraysEqual(lastParams.tags, selectedTags)) {
        setLastParams({ folderId: selectedFolderId, tags: selectedTags });
        setIsLoading(true);
    }

    // 2. Auto Decrypt Hook
    const autoDecrypt = useNotesAutoDecrypt(notes);
    const { decryptedTitles, setDecryptedTitles, decryptedTitlesRef, decryptTitles } = autoDecrypt;

    // 3. Pagination Hook
    const pagination = useNotesPagination(
        setNotes,
        selectedFolderId,
        selectedTags,
        decryptTitles
    );
    const { hasMore, isFetchingMore, loadMore, resetPagination, setPaginationState } = pagination;

    // 4. CRUD Hook
    const crud = useNotesCrud(
        setNotes,
        selectedFolderId,
        decryptedTitles,
        setDecryptedTitles,
        decryptedTitlesRef
    );
    const {
        selectedNote, setSelectedNote,
        isLoadingContent, error: crudError, setError: setCrudError,
        handleCreateNote, handleSelectNote, handleSaveContent,
        deleteNote, moveNote
    } = crud;

    // Orchestrated error
    const error = metadataError || crudError;

    const loadData = useCallback(async () => {
        try {
            // Only show full loading state on first load or manual folder change
            setIsLoading(true);
            setMetadataError(null);
            setCrudError(null);
            resetPagination();

            const [notesList, foldersList, tags] = await Promise.all([
                noteService.getNotesPaginated({
                    limit: 20,
                    folderId: selectedFolderId || undefined,
                    tags: selectedTags.length > 0 ? selectedTags : undefined
                }),
                noteService.getFolders(),
                noteService.getUserTags(),
            ]);

            setNotes(notesList.items);
            setPaginationState(notesList.nextCursor);
            setFolders(foldersList);
            setUserTags(tags);

            if (pqcEngineStatus === 'operational') {
                decryptTitles(notesList.items);
            }
        } catch (err: any) {
            setMetadataError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsInitialLoad(false);
        }
    }, [decryptTitles, pqcEngineStatus, selectedFolderId, selectedTags, resetPagination, setFolders, setUserTags, setMetadataError, setCrudError]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const deleteFolder = useCallback(async (id: string) => {
        await metadata.deleteFolder(id);
        loadData();
    }, [metadata, loadData]);

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
        userTags: metadata.userTags,
        selectedTags,
        setSelectedTags,
        decryptedTitles,
        handleCreateNote,
        handleSelectNote,
        handleSaveContent,
        createFolder: metadata.createFolder,
        updateFolder: metadata.updateFolder,
        deleteFolder,
        deleteNote,
        moveNote,
        loadMore,
        hasMore,
        isFetchingMore,
        isInitialLoad,
        setNotes
    };
};

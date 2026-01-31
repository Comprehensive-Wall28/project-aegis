import { useState, useCallback } from 'react';
import noteService, { type NoteFolder } from '../services/noteService';

export const useNotesMetadata = () => {
    const [folders, setFolders] = useState<NoteFolder[]>([]);
    const [userTags, setUserTags] = useState<string[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const createFolder = useCallback(async (name: string) => {
        try {
            const newFolder = await noteService.createFolder({ name });
            setFolders(prev => [...prev, newFolder]);
            return newFolder;
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message || 'Failed to create folder');
            throw err;
        }
    }, []);

    const updateFolder = useCallback(async (id: string, name: string) => {
        try {
            const updatedFolder = await noteService.updateFolder(id, { name });
            setFolders(prev => prev.map(f => f._id === id ? updatedFolder : f));
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message || 'Failed to update folder');
            throw err;
        }
    }, []);

    const deleteFolder = useCallback(async (id: string) => {
        try {
            await noteService.deleteFolder(id);
            setFolders(prev => prev.filter(f => f._id !== id));
            if (selectedFolderId === id) setSelectedFolderId(null);
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message || 'Failed to delete folder');
            throw err;
        }
    }, [selectedFolderId]);

    return {
        folders,
        setFolders,
        userTags,
        setUserTags,
        selectedFolderId,
        setSelectedFolderId,
        selectedTags,
        setSelectedTags,
        error,
        setError,
        createFolder,
        updateFolder,
        deleteFolder
    };
};

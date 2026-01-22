import { useState, useCallback } from 'react';
import type { NoteMetadata } from '../services/noteService';

interface UseFolderDragDropProps {
    notes: NoteMetadata[];
    moveNote: (noteId: string, folderId: string | null) => Promise<void>;
}

export const useFolderDragDrop = ({ notes, moveNote }: UseFolderDragDropProps) => {
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    const handleNoteDragStart = useCallback((e: React.DragEvent, noteId: string) => {
        setDraggedNoteId(noteId);
        e.dataTransfer.setData('noteId', noteId);
        e.dataTransfer.effectAllowed = 'move';

        // Ensure ghost image looks okay
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '0.5';
    }, []);

    const handleNoteDragEnd = useCallback((e: React.DragEvent) => {
        setDraggedNoteId(null);
        setDragOverFolderId(null);
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';
    }, []);

    const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedNoteId) {
            setDragOverFolderId(folderId === null ? 'root' : folderId);
        }
    }, [draggedNoteId]);

    const handleFolderDragLeave = useCallback(() => {
        setDragOverFolderId(null);
    }, []);

    const handleNoteDrop = useCallback(async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        setDragOverFolderId(null);

        const noteId = e.dataTransfer.getData('noteId') || draggedNoteId;
        if (!noteId) return;

        // Don't move if target is same as current folder (best effort check)
        const note = notes.find(n => n._id === noteId);
        if (note && note.noteFolderId === (targetFolderId || undefined)) return;

        try {
            await moveNote(noteId, targetFolderId);
        } catch (err) {
            console.error('Failed to move note in drop handler:', err);
        } finally {
            setDraggedNoteId(null);
        }
    }, [draggedNoteId, notes, moveNote]);

    return {
        draggedNoteId,
        dragOverFolderId,
        handleNoteDragStart,
        handleNoteDragEnd,
        handleFolderDragOver,
        handleFolderDragLeave,
        handleNoteDrop
    };
};

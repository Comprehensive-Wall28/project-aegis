import { useState, useCallback, useRef, useEffect } from 'react';
import type { NoteMetadata } from '../services/noteService';

interface UseFolderDragDropProps {
    notes: NoteMetadata[];
    moveNote: (noteId: string, folderId: string | null) => Promise<void>;
    decryptedTitles?: Record<string, string>;
}

export const useFolderDragDrop = ({ notes, moveNote, decryptedTitles = {} }: UseFolderDragDropProps) => {
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragImageRef = useRef<HTMLDivElement | null>(null);

    // Create/cleanup drag image element
    useEffect(() => {
        // Create a reusable drag image element
        const dragImage = document.createElement('div');
        dragImage.style.cssText = `
            position: fixed;
            top: -1000px;
            left: -1000px;
            padding: 8px 16px;
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            white-space: nowrap;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(dragImage);
        dragImageRef.current = dragImage;

        return () => {
            if (dragImageRef.current) {
                document.body.removeChild(dragImageRef.current);
                dragImageRef.current = null;
            }
        };
    }, []);

    const handleNoteDragStart = useCallback((e: React.DragEvent, noteId: string) => {
        setDraggedNoteId(noteId);
        setIsDragging(true);
        e.dataTransfer.setData('noteId', noteId);
        e.dataTransfer.effectAllowed = 'move';

        // Set custom drag image
        if (dragImageRef.current) {
            const title = decryptedTitles[noteId] || 'Note';
            dragImageRef.current.textContent = `📄 ${title}`;
            e.dataTransfer.setDragImage(dragImageRef.current, 20, 20);
        }

        // Make original element semi-transparent
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '0.4';
    }, [decryptedTitles]);

    const handleNoteDragEnd = useCallback((e: React.DragEvent) => {
        setDraggedNoteId(null);
        setDragOverFolderId(null);
        setIsDragging(false);
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
            setIsDragging(false);
        }
    }, [draggedNoteId, notes, moveNote]);

    return {
        draggedNoteId,
        dragOverFolderId,
        isDragging,
        handleNoteDragStart,
        handleNoteDragEnd,
        handleFolderDragOver,
        handleFolderDragLeave,
        handleNoteDrop
    };
};

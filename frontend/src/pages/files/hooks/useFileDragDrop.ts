import { useState, useCallback } from 'react';
import { useVaultUpload } from '@/hooks/useVaultUpload';

export function useFileDragDrop(
    currentFolderId: string | null,
    onMoveFiles: (targetFolderId: string | null, fileIds: string[]) => void
) {
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [isExternalDragging, setIsExternalDragging] = useState(false);
    const { uploadFiles } = useVaultUpload();

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setIsExternalDragging(true);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setIsExternalDragging(true);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsExternalDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadFiles(Array.from(e.dataTransfer.files), currentFolderId);
        }
    }, [currentFolderId, uploadFiles]);

    const handleInternalDrop = useCallback((targetId: string, droppedFileId: string, selectedIds: Set<string>) => {
        setDragOverId(null);
        const idsToMove = selectedIds.has(droppedFileId)
            ? Array.from(selectedIds)
            : [droppedFileId];
        onMoveFiles(targetId, idsToMove);
    }, [onMoveFiles]);

    return {
        dragOverId,
        setDragOverId,
        isExternalDragging,
        setIsExternalDragging,
        handleDragEnter,
        handleDragOver,
        handleDrop,
        handleInternalDrop
    };
}

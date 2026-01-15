import { useUploadStore, type GlobalUploadState } from '../stores/useUploadStore';
import { useMemo, useCallback } from 'react';

export const useVaultUpload = () => {
    // Granular subscriptions to prevent unnecessary re-renders
    const uploadFiles = useUploadStore(useCallback((s) => s.uploadFiles, []));
    const clearCompleted = useUploadStore(useCallback((s) => s.clearCompleted, []));

    // These still cause re-renders when data changes, but now we can be more selective in components if needed
    // However, for now we keep the same API but optimized with better selectors
    const uploads = useUploadStore((s) => s.uploads);

    // We derive these but they only change when uploads map changes
    const activeUploads = useMemo(() => Array.from(uploads.values()), [uploads]);
    const globalState = useMemo(() => {
        // Compute global state from items
        if (uploads.size === 0) return { status: 'idle', progress: 0 } as GlobalUploadState;

        const items = Array.from(uploads.values());
        const hasError = items.some(u => u.status === 'error');
        const allCompleted = items.every(u => u.status === 'completed');
        const isUploading = items.some(u =>
            u.status === 'pending' || u.status === 'encrypting' || u.status === 'uploading'
        );

        const totalProgress = items.reduce((sum, u) => sum + u.progress, 0);
        const avgProgress = Math.round(totalProgress / items.length);

        if (allCompleted) return { status: 'completed', progress: 100 } as GlobalUploadState;
        if (hasError && !isUploading) return { status: 'error', progress: avgProgress } as GlobalUploadState;
        if (isUploading) return { status: 'uploading', progress: avgProgress } as GlobalUploadState;
        return { status: 'idle', progress: 0 } as GlobalUploadState;
    }, [uploads]);

    return {
        uploadFiles,
        activeUploads,
        globalState,
        clearCompleted,

        // Legacy support
        uploadFile: (file: File, folderId?: string | null) => uploadFiles([file], folderId),
    };
};

/**
 * Hook to listen ONLY to the status of uploads, avoiding re-renders on progress.
 */
export const useUploadStatus = () => {
    return useUploadStore((s) => s.getGlobalState().status);
};

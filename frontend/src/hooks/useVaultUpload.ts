import { useUploadStore } from '../stores/useUploadStore';
import { useMemo } from 'react';

export const useVaultUpload = () => {
    const store = useUploadStore();

    // Derive active uploads list
    const activeUploads = useMemo(() => Array.from(store.uploads.values()), [store.uploads]);

    // Derive global state
    const globalState = useMemo(() => store.getGlobalState(), [store.uploads]);

    // Legacy state property for backward compatibility
    const state = useMemo(() => ({
        status: globalState.status === 'idle' ? 'idle'
            : globalState.status === 'completed' ? 'completed'
                : globalState.status === 'error' ? 'error'
                    : 'uploading',
        progress: globalState.progress,
        error: activeUploads.find(u => u.status === 'error')?.error ?? null
    }), [globalState, activeUploads]);

    return {
        // New batch API
        uploadFiles: store.uploadFiles,
        activeUploads,
        globalState,
        clearCompleted: store.clearCompleted,

        // Legacy API (backward compatibility)
        uploadFile: (file: File, folderId?: string | null) => store.uploadFiles([file], folderId),
        state
    };
};

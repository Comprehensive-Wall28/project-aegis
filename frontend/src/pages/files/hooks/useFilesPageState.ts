import { useState } from 'react';
import type { FileMetadata } from '@/services/vaultService';

export type ViewPreset = 'standard' | 'compact' | 'gallery';

export interface NotificationState {
    open: boolean;
    message: string;
    type: 'success' | 'error';
}

export function useFilesPageState() {
    // View State
    const [viewPreset, setViewPreset] = useState<ViewPreset>('standard');
    const [showUpload, setShowUpload] = useState(false);

    // Operation State
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    // Notification State
    const [notification, setNotification] = useState<NotificationState>({
        open: false,
        message: '',
        type: 'success'
    });

    // Preview State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewInitialId, setPreviewInitialId] = useState<string | null>(null);
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
    const [pdfPreviewFile, setPdfPreviewFile] = useState<FileMetadata | null>(null);

    return {
        viewPreset,
        setViewPreset,
        showUpload,
        setShowUpload,
        isDeleting,
        setIsDeleting,
        deletingIds,
        setDeletingIds,
        notification,
        setNotification,
        previewOpen,
        setPreviewOpen,
        previewInitialId,
        setPreviewInitialId,
        pdfPreviewOpen,
        setPdfPreviewOpen,
        pdfPreviewFile,
        setPdfPreviewFile
    };
}

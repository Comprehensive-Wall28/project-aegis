import { useState } from 'react';
import { type Folder } from '@/services/folderService';
import { type FileMetadata } from '@/services/vaultService';

export interface RenameDialogState {
    open: boolean;
    folder: Folder | null;
}

export interface ShareDialogState {
    open: boolean;
    item: FileMetadata | null;
    type: 'file';
}

export interface DeleteConfirmState {
    open: boolean;
    type: 'file' | 'mass' | 'folder';
    id?: string;
    count?: number;
}

export function useFilesDialogs() {
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [renameFolderDialog, setRenameFolderDialog] = useState<RenameDialogState>({ open: false, folder: null });
    const [moveToFolderDialog, setMoveToFolderDialog] = useState(false);
    const [filesToMove, setFilesToMove] = useState<string[]>([]);
    const [colorPickerFolderId, setColorPickerFolderId] = useState<string | null>(null);
    const [shareDialog, setShareDialog] = useState<ShareDialogState>({ open: false, item: null, type: 'file' });
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false, type: 'file' });

    return {
        newFolderDialog,
        setNewFolderDialog,
        renameFolderDialog,
        setRenameFolderDialog,
        moveToFolderDialog,
        setMoveToFolderDialog,
        filesToMove,
        setFilesToMove,
        colorPickerFolderId,
        setColorPickerFolderId,
        shareDialog,
        setShareDialog,
        deleteConfirm,
        setDeleteConfirm
    };
}

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import folderService, { type Folder } from '@/services/folderService';
import { useSessionStore } from '@/stores/sessionStore';
import { useFolderKeyStore } from '@/stores/useFolderKeyStore';
import { generateFolderKey, wrapKey, unwrapKey } from '@/lib/cryptoUtils';

// Types
import { type NotificationState } from './useFilesPageState';
import { type RenameDialogState, type DeleteConfirmState } from './useFilesDialogs';

interface UseFileActionsProps {
    files: FileMetadata[];
    folders: Folder[];
    setFiles: React.Dispatch<React.SetStateAction<FileMetadata[]>>;
    setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
    currentFolderId: string | null;
    fetchData: () => Promise<void>;
    selectedIds: Set<string>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    clearSelection: () => void;

    // Dialog State Setters
    setNewFolderDialog: (open: boolean) => void;
    setRenameFolderDialog: (state: RenameDialogState) => void;
    setDeleteConfirm: (state: DeleteConfirmState) => void;
    setIsDeleting: (isDeleting: boolean) => void;
    setDeletingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setNotification: (state: NotificationState) => void;
    setFilesToMove: (ids: string[]) => void;
    setMoveToFolderDialog: (open: boolean) => void;
    setColorPickerFolderId: (id: string | null) => void;
    setPreviewInitialId: (id: string | null) => void;
    setPreviewOpen: (open: boolean) => void;
    setPdfPreviewFile: (file: FileMetadata | null) => void;
    setPdfPreviewOpen: (open: boolean) => void;
    toggleSelect: (id: string) => void;

    // Dialog State Getters (needed for callbacks)
    renameFolderDialog: RenameDialogState;
    deleteConfirm: DeleteConfirmState;
    filesToMove: string[];
    colorPickerFolderId: string | null;
}

export function useFileActions({
    files,
    folders,
    setFiles,
    setFolders,
    currentFolderId,
    fetchData,
    selectedIds,
    setSelectedIds,
    clearSelection,
    setNewFolderDialog,
    setRenameFolderDialog,
    setDeleteConfirm,
    setIsDeleting,
    setDeletingIds,
    setNotification,
    setFilesToMove,
    setMoveToFolderDialog,
    setColorPickerFolderId,
    setPreviewInitialId,
    setPreviewOpen,
    setPdfPreviewFile,
    setPdfPreviewOpen,
    toggleSelect,
    renameFolderDialog,
    deleteConfirm,
    filesToMove,
    colorPickerFolderId
}: UseFileActionsProps) {
    const navigate = useNavigate();

    const navigateToFolder = useCallback((folder: Folder | null) => {
        if (folder) {
            navigate(`/dashboard/files/${folder._id}`);
        } else {
            navigate('/dashboard/files');
        }
        clearSelection();
    }, [navigate, clearSelection]);

    const handleCreateFolder = useCallback(async (name: string) => {
        const { user } = useSessionStore.getState();
        const masterKey = user?.vaultKey;
        if (!masterKey) {
            setNotification({ open: true, message: 'Vault keys not ready. Please wait or log in again.', type: 'error' });
            return;
        }
        try {
            const folderKey = await generateFolderKey();
            const encryptedSessionKey = await wrapKey(folderKey, masterKey);
            const newFolder = await folderService.createFolder(name.trim(), currentFolderId, encryptedSessionKey);
            useFolderKeyStore.getState().setKey(newFolder._id, folderKey);
            setNewFolderDialog(false);
            fetchData();
            setNotification({ open: true, message: 'Folder created successfully', type: 'success' });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            console.error('Failed to create folder:', err);
            setNotification({ open: true, message: error.response?.data?.message || 'Failed to create secure folder', type: 'error' });
        }
    }, [currentFolderId, fetchData, setNewFolderDialog, setNotification]);

    const handleRenameFolder = useCallback(async (newName: string) => {
        if (!renameFolderDialog.folder) return;
        try {
            await folderService.renameFolder(renameFolderDialog.folder._id, newName.trim());
            setRenameFolderDialog({ open: false, folder: null });
            fetchData();
            setNotification({ open: true, message: 'Folder renamed successfully', type: 'success' });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            console.error('Failed to rename folder:', err);
            setNotification({ open: true, message: error.response?.data?.message || 'Failed to rename folder', type: 'error' });
        }
    }, [renameFolderDialog.folder, fetchData, setRenameFolderDialog, setNotification]);

    const handleDeleteFolder = useCallback((id: string) => {
        setDeleteConfirm({ open: true, type: 'folder', id });
    }, [setDeleteConfirm]);

    const confirmDeleteFolder = useCallback(async () => {
        if (!deleteConfirm.id) return;
        setIsDeleting(true);
        try {
            await folderService.deleteFolder(deleteConfirm.id);
            fetchData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setNotification({ open: true, message: error.response?.data?.message || 'Failed to delete folder', type: 'error' });
        } finally {
            setIsDeleting(false);
            setDeleteConfirm({ open: false, type: 'file' });
        }
    }, [deleteConfirm.id, fetchData, setIsDeleting, setNotification, setDeleteConfirm]);

    const handleDeleteFile = useCallback((id: string) => {
        setDeleteConfirm({ open: true, type: 'file', id });
    }, [setDeleteConfirm]);

    const confirmDeleteFile = useCallback(async () => {
        if (!deleteConfirm.id) return;
        setIsDeleting(true);
        try {
            setDeletingIds(prev => new Set(prev).add(deleteConfirm.id!));
            await vaultService.deleteFile(deleteConfirm.id);
            setFiles(current => current.filter(f => f._id !== deleteConfirm.id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(deleteConfirm.id!);
                return next;
            });
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(deleteConfirm.id!);
                return next;
            });
            setIsDeleting(false);
            setDeleteConfirm({ open: false, type: 'file' });
            useSessionStore.getState().fetchStorageStats();
        }
    }, [deleteConfirm.id, setFiles, setSelectedIds, setIsDeleting, setDeletingIds, setDeleteConfirm]);

    const handleMassDelete = useCallback(() => {
        if (selectedIds.size === 0) return;
        setDeleteConfirm({ open: true, type: 'mass', count: selectedIds.size });
    }, [selectedIds.size, setDeleteConfirm]);

    const confirmMassDelete = useCallback(async () => {
        setIsDeleting(true);
        const ids = Array.from(selectedIds);
        setDeletingIds(new Set(ids));

        const results = await Promise.all(ids.map(async (id) => {
            try {
                await vaultService.deleteFile(id);
                return { id, success: true };
            } catch (err) {
                console.error(`Failed to delete ${id}:`, err);
                return { id, success: false };
            }
        }));

        const successfulIds = new Set(results.filter(r => r.success).map(r => r.id));

        if (successfulIds.size > 0) {
            setFiles(prev => prev.filter(f => !successfulIds.has(f._id)));
            setSelectedIds(prev => {
                const next = new Set(prev);
                successfulIds.forEach(id => next.delete(id));
                return next;
            });
            const failedCount = ids.length - successfulIds.size;
            if (failedCount > 0) {
                setNotification({ open: true, message: `Deleted ${successfulIds.size} files. ${failedCount} failed.`, type: 'error' });
            } else {
                setNotification({ open: true, message: `Deleted ${ids.length} files`, type: 'success' });
            }
        } else if (ids.length > 0) {
            setNotification({ open: true, message: 'Failed to delete selected files', type: 'error' });
        }

        setDeletingIds(new Set());
        setIsDeleting(false);
        setDeleteConfirm({ open: false, type: 'file' });

        if (successfulIds.size === ids.length) {
            clearSelection();
        }
        useSessionStore.getState().fetchStorageStats();
    }, [selectedIds, setFiles, setSelectedIds, clearSelection, setIsDeleting, setDeletingIds, setNotification, setDeleteConfirm]);

    const handleMoveToFolder = useCallback(async (targetFolderId: string | null, idsToOverride?: string[]) => {
        const ids = idsToOverride || filesToMove;
        if (ids.length === 0) return;

        try {
            const { user } = useSessionStore.getState();
            if (!user?.vaultKey) {
                setNotification({ open: true, message: 'Vault locked. Please re-login.', type: 'error' });
                return;
            }

            let targetKey: CryptoKey;
            if (!targetFolderId) {
                targetKey = user.vaultKey;
            } else {
                let targetFolder = folders.find(f => f._id === targetFolderId);
                if (!targetFolder) {
                    targetFolder = await folderService.getFolder(targetFolderId);
                }
                if (!targetFolder.encryptedSessionKey) {
                    throw new Error('Target folder has no encryption key');
                }
                targetKey = await unwrapKey(targetFolder.encryptedSessionKey, user.vaultKey, 'AES-GCM');
            }

            const updates: { fileId: string; encryptedKey: string; encapsulatedKey: string }[] = [];
            const newEncapsulatedKey = targetFolderId ? 'FOLDER' : 'AES-KW';

            for (const id of ids) {
                const file = files.find(f => f._id === id);
                if (!file) continue;

                let sourceKey: CryptoKey | undefined;
                if (!file.folderId) {
                    sourceKey = user.vaultKey;
                } else {
                    sourceKey = useFolderKeyStore.getState().keys.get(file.folderId);
                    if (!sourceKey) {
                        const sourceFolder = await folderService.getFolder(file.folderId);
                        if (!sourceFolder.encryptedSessionKey) throw new Error(`Source folder ${file.folderId} locked`);
                        sourceKey = await unwrapKey(sourceFolder.encryptedSessionKey, user.vaultKey, 'AES-GCM');
                        useFolderKeyStore.getState().setKey(file.folderId, sourceKey);
                    }
                }

                if (!sourceKey) throw new Error('Could not resolve source key');
                const fileKey = await unwrapKey(file.encryptedSymmetricKey, sourceKey);
                const newEncryptedKey = await wrapKey(fileKey, targetKey);
                updates.push({ fileId: file._id, encryptedKey: newEncryptedKey, encapsulatedKey: newEncapsulatedKey });
            }

            await folderService.moveFiles(updates, targetFolderId);

            setFilesToMove([]);
            clearSelection();
            setMoveToFolderDialog(false);
            fetchData();
            setNotification({ open: true, message: `Moved ${updates.length} files successfully`, type: 'success' });
        } catch (err: unknown) {
            const error = err as { message?: string };
            console.error('Failed to move files:', err);
            setNotification({ open: true, message: error.message || 'Failed to move files', type: 'error' });
        }
    }, [filesToMove, clearSelection, fetchData, files, folders, setFilesToMove, setMoveToFolderDialog, setNotification]);

    const handleFolderColorChange = useCallback(async (color: string) => {
        if (!colorPickerFolderId) return;
        try {
            await folderService.updateFolderColor(colorPickerFolderId, color);
            setFolders(prev => prev.map(f => f._id === colorPickerFolderId ? { ...f, color } : f));
            setColorPickerFolderId(null);
            setNotification({ open: true, message: 'Folder color updated', type: 'success' });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            console.error('Failed to update folder color:', err);
            setNotification({ open: true, message: error.response?.data?.message || 'Failed to update folder color', type: 'error' });
        }
    }, [colorPickerFolderId, setFolders, setColorPickerFolderId, setNotification]);

    const handleFileClick = useCallback((file: FileMetadata, e: React.MouseEvent) => {
        if (e.ctrlKey || e.metaKey) {
            toggleSelect(file._id);
            return;
        }
        if (file.mimeType?.startsWith('image/')) {
            setPreviewInitialId(file._id);
            setPreviewOpen(true);
        } else if (file.mimeType === 'application/pdf') {
            setPdfPreviewFile(file);
            setPdfPreviewOpen(true);
        } else {
            toggleSelect(file._id);
        }
    }, [toggleSelect, setPreviewInitialId, setPreviewOpen, setPdfPreviewFile, setPdfPreviewOpen]);

    return {
        navigateToFolder,
        handleCreateFolder,
        handleRenameFolder,
        handleDeleteFolder,
        confirmDeleteFolder,
        handleDeleteFile,
        confirmDeleteFile,
        handleMassDelete,
        confirmMassDelete,
        handleMoveToFolder,
        handleFolderColorChange,
        handleFileClick
    };
}

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Stack,
    Dialog,
    DialogActions,
    Button,
    DialogTitle,
    DialogContent,
    Typography,
    alpha,
    useTheme,
    Snackbar,
    Alert
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload as UploadIcon } from '@mui/icons-material';

// Services & TypeS
import vaultService, { type FileMetadata } from '@/services/vaultService';
import folderService, { type Folder } from '@/services/folderService';
import { useSessionStore } from '@/stores/sessionStore';
import { useFolderKeyStore } from '@/stores/useFolderKeyStore';
import { generateFolderKey, wrapKey, unwrapKey } from '@/lib/cryptoUtils';
import { type ViewPreset } from './types';

// Components
import UploadZone from '@/components/vault/UploadZone';
import { ImagePreviewOverlay } from '@/components/vault/ImagePreviewOverlay';
import { PDFPreviewOverlay } from '@/components/vault/PDFPreviewOverlay';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ContextMenu } from '@/components/ContextMenu';

// New Components
import { FilesHeader } from './components/FilesHeader';
import { FilesToolbar } from './components/FilesToolbar';
import { FilesBreadcrumbs } from './components/FilesBreadcrumbs';
import { FilesGrid } from './components/FilesGrid';
import { NewFolderDialog } from './components/dialogs/NewFolderDialog';
import { RenameFolderDialog } from './components/dialogs/RenameFolderDialog';
import { MoveToFolderDialog } from './components/dialogs/MoveToFolderDialog';
import { ColorPickerDialog } from './components/dialogs/ColorPickerDialog';

// Hooks
import { useFilesData } from './hooks/useFilesData';
import { useFileSelection } from './hooks/useFileSelection';
import { useFileDragDrop } from './hooks/useFileDragDrop';
import { useFileContextMenu } from './hooks/useFileContextMenu';


export function FilesPage() {
    const theme = useTheme();
    const navigate = useNavigate();

    // Data Hook (Fetching, State, Filtering)
    const {
        files,
        folders,
        setFiles,
        setFolders,
        folderPath,
        isLoading,
        searchQuery,
        setSearchQuery,
        downloadingId,
        handleDownload,
        filteredFiles,
        filteredFolders,
        imageFiles,
        currentFolderId,
        fetchData,
        searchParams
    } = useFilesData();

    const highlightId = searchParams.get('highlight');

    // Selection Hook
    const {
        selectedIds,
        toggleSelect,
        selectAll,
        clearSelection,
        setSelectedIds
    } = useFileSelection(files);


    // Local UI State
    const [viewPreset] = useState<ViewPreset>('standard');
    const [showUpload, setShowUpload] = useState(false);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Dialog States
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [renameFolderDialog, setRenameFolderDialog] = useState<{ open: boolean; folder: Folder | null }>({ open: false, folder: null });
    const [moveToFolderDialog, setMoveToFolderDialog] = useState(false);
    const [filesToMove, setFilesToMove] = useState<string[]>([]);
    const [colorPickerFolderId, setColorPickerFolderId] = useState<string | null>(null);
    const [shareDialog, setShareDialog] = useState<{ open: boolean; item: FileMetadata | Folder | null; type: 'file' | 'folder' }>({ open: false, item: null, type: 'folder' });
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'file' | 'mass' | 'folder'; id?: string; count?: number; }>({ open: false, type: 'file' });

    // Notifications
    const [notification, setNotification] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });

    // Previews
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewInitialId, setPreviewInitialId] = useState<string | null>(null);
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
    const [pdfPreviewFile, setPdfPreviewFile] = useState<FileMetadata | null>(null);

    // Handlers (Defined here to pass to hooks/components)

    const navigateToFolder = useCallback((folder: Folder | null) => {
        if (folder) {
            navigate(`/dashboard/files/${folder._id}`);
        } else {
            navigate('/dashboard/files');
        }
        clearSelection();
    }, [navigate, clearSelection]);

    const handleCreateFolder = useCallback(async (name: string) => {
        // Access store directly to get fresh state without triggering re-renders or adding dependencies
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
        } catch (err: any) {
            console.error('Failed to create folder:', err);
            setNotification({ open: true, message: err.response?.data?.message || 'Failed to create secure folder', type: 'error' });
        }
    }, [currentFolderId, fetchData]);

    const handleRenameFolder = useCallback(async (newName: string) => {
        if (!renameFolderDialog.folder) return;
        try {
            await folderService.renameFolder(renameFolderDialog.folder._id, newName.trim());
            setRenameFolderDialog({ open: false, folder: null });
            fetchData();
            setNotification({ open: true, message: 'Folder renamed successfully', type: 'success' });
        } catch (err: any) {
            console.error('Failed to rename folder:', err);
            setNotification({ open: true, message: err.response?.data?.message || 'Failed to rename folder', type: 'error' });
        }
    }, [renameFolderDialog.folder, fetchData]);

    const handleDeleteFolder = useCallback((id: string) => {
        setDeleteConfirm({ open: true, type: 'folder', id });
    }, []);

    const confirmDeleteFolder = useCallback(async () => {
        if (!deleteConfirm.id) return;
        setIsDeleting(true);
        try {
            await folderService.deleteFolder(deleteConfirm.id);
            fetchData();
        } catch (err: any) {
            setNotification({ open: true, message: err.response?.data?.message || 'Failed to delete folder', type: 'error' });
        } finally {
            setIsDeleting(false);
            setDeleteConfirm({ open: false, type: 'file' });
        }
    }, [deleteConfirm.id, fetchData]);

    const handleDeleteFile = useCallback((id: string) => {
        setDeleteConfirm({ open: true, type: 'file', id });
    }, []);

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

            // Refresh storage stats
            useSessionStore.getState().fetchStorageStats();
        }
    }, [deleteConfirm.id, setFiles, setSelectedIds]);

    const handleMassDelete = useCallback(() => {
        if (selectedIds.size === 0) return;
        setDeleteConfirm({ open: true, type: 'mass', count: selectedIds.size });
    }, [selectedIds.size]);

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

        // Refresh storage stats
        useSessionStore.getState().fetchStorageStats();
    }, [selectedIds, setFiles, setSelectedIds, clearSelection]);

    const handleMoveToFolder = useCallback(async (targetFolderId: string | null, idsToOverride?: string[]) => {
        const ids = idsToOverride || filesToMove;
        if (ids.length === 0) return;

        try {
            const { user } = useSessionStore.getState();
            if (!user?.vaultKey) {
                setNotification({ open: true, message: 'Vault locked. Please re-login.', type: 'error' });
                return;
            }

            // 1. Resolve Target Key
            let targetKey: CryptoKey;
            if (!targetFolderId) {
                targetKey = user.vaultKey;
            } else {
                // Try to find in current list first
                let targetFolder = folders.find(f => f._id === targetFolderId);
                // If not found (e.g. moving to ancestor not in current view), fetch it
                if (!targetFolder) {
                    // Start Loading state?
                    targetFolder = await folderService.getFolder(targetFolderId);
                }

                if (!targetFolder.encryptedSessionKey) {
                    throw new Error('Target folder has no encryption key');
                }
                targetKey = await unwrapKey(targetFolder.encryptedSessionKey, user.vaultKey, 'AES-GCM');
            }

            // 2. Process Files (Decrypt -> Re-encrypt)
            const updates: { fileId: string; encryptedKey: string; encapsulatedKey: string }[] = [];

            const newEncapsulatedKey = targetFolderId ? 'FOLDER' : 'AES-KW';

            for (const id of ids) {
                const file = files.find(f => f._id === id);
                if (!file) continue;

                let sourceKey: CryptoKey | undefined;

                // Get Source Key
                if (!file.folderId) {
                    sourceKey = user.vaultKey;
                } else {
                    // Try store first
                    sourceKey = useFolderKeyStore.getState().keys.get(file.folderId);

                    // If missing (e.g. search result from another folder), fetch it
                    if (!sourceKey) {
                        const sourceFolder = await folderService.getFolder(file.folderId);
                        if (!sourceFolder.encryptedSessionKey) throw new Error(`Source folder ${file.folderId} locked`);
                        sourceKey = await unwrapKey(sourceFolder.encryptedSessionKey, user.vaultKey, 'AES-GCM');
                        // Cache for future
                        useFolderKeyStore.getState().setKey(file.folderId, sourceKey);
                    }
                }

                // Re-wrap
                if (!sourceKey) throw new Error('Could not resolve source key');
                const fileKey = await unwrapKey(file.encryptedSymmetricKey, sourceKey);
                const newEncryptedKey = await wrapKey(fileKey, targetKey);
                updates.push({ fileId: file._id, encryptedKey: newEncryptedKey, encapsulatedKey: newEncapsulatedKey });
            }

            // 3. Send Batch Update
            await folderService.moveFiles(updates, targetFolderId);

            setFilesToMove([]);
            clearSelection();
            setMoveToFolderDialog(false);
            fetchData();
            setNotification({ open: true, message: `Moved ${updates.length} files successfully`, type: 'success' });
        } catch (err: any) {
            console.error('Failed to move files:', err);
            setNotification({ open: true, message: err.message || 'Failed to move files', type: 'error' });
        }
    }, [filesToMove, clearSelection, fetchData, files, folders, setFilesToMove, setMoveToFolderDialog]);

    const handleFolderColorChange = useCallback(async (color: string) => {
        if (!colorPickerFolderId) return;
        try {
            await folderService.updateFolderColor(colorPickerFolderId, color);
            setFolders(prev => prev.map(f => f._id === colorPickerFolderId ? { ...f, color } : f));
            setColorPickerFolderId(null);
            setNotification({ open: true, message: 'Folder color updated', type: 'success' });
        } catch (err: any) {
            console.error('Failed to update folder color:', err);
            setNotification({ open: true, message: err.response?.data?.message || 'Failed to update folder color', type: 'error' });
        }
    }, [colorPickerFolderId, setFolders]);

    // Drag Drop Hook
    const {
        dragOverId,
        setDragOverId,
        isExternalDragging,
        setIsExternalDragging,
        handleDragEnter,
        handleDragOver,
        handleDrop,
        handleInternalDrop
    } = useFileDragDrop(currentFolderId, handleMoveToFolder);

    // Context Menu Hook
    const {
        contextMenu,
        handleContextMenu,
        closeContextMenu,
        menuItems
    } = useFileContextMenu({
        files,
        folders,
        selectedIds,
        setFilesToMove,
        setMoveToFolderDialog,
        setShareDialog,
        setNewFolderName: () => { }, // Not needed as dialogs handle their own name
        setRenameFolderDialog,
        setColorPickerFolderId,
        setNewFolderDialog,
        handleDelete: handleDeleteFile,
        handleDeleteFolder,
        navigateToFolder,
        setNotification
    });

    // File Click Logic
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
    }, [toggleSelect]);

    return (
        <Stack
            spacing={4}
            className="text-sharp"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onContextMenu={(e) => handleContextMenu(e, { type: 'empty' })}
            sx={{ position: 'relative', pb: 4 }}
        >
            {/* External Drag Overlay */}
            <AnimatePresence>
                {isExternalDragging && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onDragLeave={() => setIsExternalDragging(false)}
                        onDrop={handleDrop}
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            border: `4px dashed ${theme.palette.primary.main}`,
                            m: 2,
                            borderRadius: '24px'
                        }}
                    >
                        <Box sx={{ textAlign: 'center', color: 'primary.main', pointerEvents: 'none' }}>
                            <UploadIcon sx={{ fontSize: 80, mb: 2 }} />
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>Drop to Secure Files</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, opacity: 0.8 }}>
                                Uploading to: {currentFolderId ? folders.find(f => f._id === currentFolderId)?.name : 'Root (Home)'}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </AnimatePresence>

            <FilesHeader
                fileCount={files.length}
                selectedCount={selectedIds.size}
                showUpload={showUpload}
                onMassDelete={handleMassDelete}
                onNewFolder={useCallback(() => setNewFolderDialog(true), [])}
                onToggleUpload={useCallback(() => setShowUpload(prev => !prev), [])}
                onMove={useCallback(() => {
                    setFilesToMove(Array.from(selectedIds));
                    setMoveToFolderDialog(true);
                }, [selectedIds])}
            />

            <FilesToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCount={selectedIds.size}
                totalCount={files.length}
                onSelectAll={selectAll}
            />

            {/* Upload Modal Overlay */}
            <Dialog
                open={showUpload}
                onClose={() => setShowUpload(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        backgroundImage: 'none',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 4 }}>
                    Secure File Upload
                </DialogTitle>
                <DialogContent sx={{ px: 4, pb: 4 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center', fontWeight: 500 }}>
                        Files are encrypted locally using AES-CTR before being uploaded.
                    </Typography>
                    <UploadZone
                        folderId={currentFolderId}
                        onUploadComplete={() => { /* Maintain open for progress */ }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.4) }}>
                    <Button onClick={() => setShowUpload(false)} sx={{ fontWeight: 700, px: 4, borderRadius: '12px' }}>
                        Done
                    </Button>
                </DialogActions>
            </Dialog>

            <FilesBreadcrumbs
                folderPath={folderPath}
                onNavigate={navigateToFolder}
                dragOverId={dragOverId}
                setDragOverId={setDragOverId}
                onMove={(targetId, droppedFileId) => handleInternalDrop(targetId || '', droppedFileId, selectedIds)}
            />

            <FilesGrid
                isLoading={isLoading}
                files={filteredFiles}
                folders={filteredFolders}
                viewPreset={viewPreset}
                selectedIds={selectedIds}
                downloadingId={downloadingId}
                deletingIds={deletingIds}

                onNavigate={navigateToFolder}
                onFileClick={handleFileClick}
                onContextMenu={handleContextMenu}
                onShare={(item) => setShareDialog({ open: true, item, type: (item as any).mimeType ? 'file' : 'folder' })}
                onDeleteFile={handleDeleteFile}
                onDeleteFolder={handleDeleteFolder}
                onDownload={handleDownload}
                onDragOver={setDragOverId}
                onDrop={(targetId, droppedId) => handleInternalDrop(targetId, droppedId, selectedIds)}
                onToggleSelect={toggleSelect}
                onMove={(file) => {
                    setFilesToMove([file._id]);
                    setMoveToFolderDialog(true);
                }}
                dragOverId={dragOverId}
                highlightId={highlightId}
            />

            <ContextMenu
                open={contextMenu.open}
                anchorPosition={contextMenu.position}
                onClose={closeContextMenu}
                items={menuItems}
            />

            <NewFolderDialog
                open={newFolderDialog}
                onClose={() => setNewFolderDialog(false)}
                onCreate={handleCreateFolder}
            />

            <RenameFolderDialog
                open={renameFolderDialog.open}
                folder={renameFolderDialog.folder}
                onClose={() => setRenameFolderDialog({ open: false, folder: null })}
                onRename={handleRenameFolder}
            />

            <MoveToFolderDialog
                open={moveToFolderDialog}
                onClose={() => setMoveToFolderDialog(false)}
                currentFolderId={currentFolderId}
                fileCount={filesToMove.length}
                onMove={(targetId) => handleMoveToFolder(targetId)}
            />

            <ColorPickerDialog
                open={Boolean(colorPickerFolderId)}
                onClose={() => setColorPickerFolderId(null)}
                onColorSelect={handleFolderColorChange}
            />

            <ImagePreviewOverlay
                key={previewOpen ? `preview-${previewInitialId}` : 'preview-closed'}
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                files={imageFiles}
                initialFileId={previewInitialId || ''}
            />

            <PDFPreviewOverlay
                isOpen={pdfPreviewOpen}
                onClose={() => {
                    setPdfPreviewOpen(false);
                    setPdfPreviewFile(null);
                }}
                file={pdfPreviewFile}
            />

            {shareDialog.open && shareDialog.item && (
                <ShareDialog
                    open={shareDialog.open}
                    onClose={() => setShareDialog(prev => ({ ...prev, open: false, item: null }))}
                    item={shareDialog.item}
                    type={shareDialog.type}
                />
            )}

            <ConfirmDialog
                open={deleteConfirm.open}
                title={deleteConfirm.type === 'folder' ? 'Delete Folder' : deleteConfirm.type === 'mass' ? 'Delete Files' : 'Delete File'}
                message={deleteConfirm.type === 'folder' ? 'Are you sure? This cannot be undone.' : deleteConfirm.type === 'mass' ? `Delete ${deleteConfirm.count} files?` : 'Delete this file?'}
                confirmText="Delete"
                onConfirm={() => {
                    if (deleteConfirm.type === 'file') confirmDeleteFile();
                    else if (deleteConfirm.type === 'mass') confirmMassDelete();
                    else if (deleteConfirm.type === 'folder') confirmDeleteFolder();
                }}
                onCancel={() => setDeleteConfirm({ open: false, type: 'file' })}
                isLoading={isDeleting}
                variant="danger"
            />

            <Snackbar
                open={notification.open}
                autoHideDuration={4000}
                onClose={() => setNotification({ ...notification, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setNotification({ ...notification, open: false })}
                    severity={notification.type}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Stack>
    );
}

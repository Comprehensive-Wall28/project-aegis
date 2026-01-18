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
import { generateFolderKey, wrapKey } from '@/lib/cryptoUtils';
import { type ViewPreset } from './types';

// Components
import { BackendDown } from '@/components/BackendDown';
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
        backendError,
        searchQuery,
        setSearchQuery,
        downloadingId,
        handleDownload,
        filteredFiles,
        filteredFolders,
        imageFiles,
        currentFolderId,
        fetchData
    } = useFilesData();

    // Selection Hook
    const {
        selectedIds,
        toggleSelect,
        selectAll,
        clearSelection,
        setSelectedIds
    } = useFileSelection(files);


    // Local UI State
    const [viewPreset, setViewPreset] = useState<ViewPreset>('standard');
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

    const handleCreateFolder = async (name: string) => {
        const { user } = useSessionStore.getState();
        const masterKey = user?.vaultKey;
        if (!masterKey) {
            alert('Vault keys not ready. Please wait or log in again.');
            return;
        }
        try {
            const folderKey = await generateFolderKey();
            const encryptedSessionKey = await wrapKey(folderKey, masterKey);
            const newFolder = await folderService.createFolder(name.trim(), currentFolderId, encryptedSessionKey);
            useFolderKeyStore.getState().setKey(newFolder._id, folderKey);
            setNewFolderDialog(false);
            fetchData();
        } catch (err) {
            console.error('Failed to create folder:', err);
            alert('Failed to create secure folder. Please try again.');
        }
    };

    const handleRenameFolder = async (newName: string) => {
        if (!renameFolderDialog.folder) return;
        try {
            await folderService.renameFolder(renameFolderDialog.folder._id, newName.trim());
            setRenameFolderDialog({ open: false, folder: null });
            fetchData();
        } catch (err) {
            console.error('Failed to rename folder:', err);
        }
    };

    const handleDeleteFolder = (id: string) => {
        setDeleteConfirm({ open: true, type: 'folder', id });
    };

    const confirmDeleteFolder = async () => {
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
    };

    const handleDeleteFile = (id: string) => {
        setDeleteConfirm({ open: true, type: 'file', id });
    };

    const confirmDeleteFile = async () => {
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
        }
    };

    const handleMassDelete = () => {
        if (selectedIds.size === 0) return;
        setDeleteConfirm({ open: true, type: 'mass', count: selectedIds.size });
    };

    const confirmMassDelete = async () => {
        setIsDeleting(true);
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            try {
                setDeletingIds(prev => new Set(prev).add(id));
                await vaultService.deleteFile(id);
                setFiles(prev => prev.filter(f => f._id !== id));
            } catch (err) {
                console.error(`Failed to delete ${id}:`, err);
            } finally {
                setDeletingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }
        clearSelection();
        setIsDeleting(false);
        setDeleteConfirm({ open: false, type: 'file' });
    };

    const handleMoveToFolder = async (targetFolderId: string | null, idsToOverride?: string[]) => {
        const ids = idsToOverride || filesToMove;
        if (ids.length === 0) return;
        try {
            await folderService.moveFiles(ids, targetFolderId);
            setFilesToMove([]);
            clearSelection();
            setMoveToFolderDialog(false);
            fetchData();
        } catch (err) {
            console.error('Failed to move files:', err);
        }
    };

    const handleFolderColorChange = async (color: string) => {
        if (!colorPickerFolderId) return;
        try {
            await folderService.updateFolderColor(colorPickerFolderId, color);
            setFolders(prev => prev.map(f => f._id === colorPickerFolderId ? { ...f, color } : f));
            setColorPickerFolderId(null);
        } catch (err) {
            console.error('Failed to update folder color:', err);
        }
    };

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
        getMenuItems
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
    const handleFileClick = (file: FileMetadata, e: React.MouseEvent) => {
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
    };

    if (backendError) {
        return <BackendDown onRetry={fetchData} />;
    }

    return (
        <Stack
            spacing={4}
            className="text-sharp"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            sx={{ position: 'relative', height: '100%' }}
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
                onNewFolder={() => setNewFolderDialog(true)}
                onToggleUpload={() => setShowUpload(!showUpload)}
            />

            <FilesToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewPreset={viewPreset}
                onViewPresetChange={setViewPreset}
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
                currentFolderId={currentFolderId}
                onNavigate={navigateToFolder}
                onFileClick={handleFileClick}
                onContextMenu={handleContextMenu}
                onShare={(item) => setShareDialog({ open: true, item, type: (item as any).mimeType ? 'file' : 'folder' })}
                onDeleteFile={handleDeleteFile}
                onDeleteFolder={handleDeleteFolder}
                onDownload={handleDownload}
                onDragOver={setDragOverId}
                onDrop={(targetId, droppedId) => handleInternalDrop(targetId, droppedId, selectedIds)}
                onDragStart={() => { }}
                dragOverId={dragOverId}
            />

            <ContextMenu
                open={contextMenu.open}
                anchorPosition={contextMenu.position}
                onClose={closeContextMenu}
                items={getMenuItems()}
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
                folders={filteredFolders} // Should this be all folders? using filtered for now
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

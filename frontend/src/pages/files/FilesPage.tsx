import { useCallback } from 'react';
import {
    Box,
    Stack,
    Typography,
    alpha,
    useTheme,
    Snackbar,
    Alert
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload as UploadIcon } from '@mui/icons-material';

// Hooks
import { useFilesData } from './hooks/useFilesData';
import { useFileSelection } from './hooks/useFileSelection';
import { useFileDragDrop } from './hooks/useFileDragDrop';
import { useFileContextMenu } from './hooks/useFileContextMenu';
import { useFilesPageState } from './hooks/useFilesPageState';
import { useFilesDialogs } from './hooks/useFilesDialogs';
import { useFileActions } from './hooks/useFileActions';

// Components
import { ImagePreviewOverlay } from '@/components/vault/ImagePreviewOverlay';
import { PDFPreviewOverlay } from '@/components/vault/PDFPreviewOverlay';
import { ContextMenu } from '@/components/ContextMenu';
import { FilesHeader } from './components/FilesHeader';
import { FilesToolbar } from './components/FilesToolbar';
import { FilesBreadcrumbs } from './components/FilesBreadcrumbs';
import { FilesGrid } from './components/FilesGrid';
import { FilesDialogs } from './components/FilesDialogs';

export function FilesPage() {
    const theme = useTheme();

    // 1. Data & Selection
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
        searchParams,
        hasMore,
        loadMore,
        isLoadingMore
    } = useFilesData();

    const {
        selectedIds,
        toggleSelect,
        selectAll,
        clearSelection,
        setSelectedIds
    } = useFileSelection(files);

    const highlightId = searchParams.get('highlight');

    // 2. UI State & Dialogs
    const pageState = useFilesPageState();
    const dialogState = useFilesDialogs();

    // 3. Actions
    const actions = useFileActions({
        files,
        folders,
        setFiles,
        setFolders,
        currentFolderId,
        fetchData,
        selectedIds,
        setSelectedIds,
        clearSelection,
        // Dialog Setters from hooks
        setNewFolderDialog: dialogState.setNewFolderDialog,
        setRenameFolderDialog: dialogState.setRenameFolderDialog,
        setDeleteConfirm: dialogState.setDeleteConfirm,
        setIsDeleting: pageState.setIsDeleting,
        setDeletingIds: pageState.setDeletingIds,
        setNotification: pageState.setNotification,
        setFilesToMove: dialogState.setFilesToMove,
        setMoveToFolderDialog: dialogState.setMoveToFolderDialog,
        setColorPickerFolderId: dialogState.setColorPickerFolderId,
        setPreviewInitialId: pageState.setPreviewInitialId,
        setPreviewOpen: pageState.setPreviewOpen,
        setPdfPreviewFile: pageState.setPdfPreviewFile,
        setPdfPreviewOpen: pageState.setPdfPreviewOpen,
        toggleSelect,
        // Dialog State Getters
        renameFolderDialog: dialogState.renameFolderDialog,
        deleteConfirm: dialogState.deleteConfirm,
        filesToMove: dialogState.filesToMove,
        colorPickerFolderId: dialogState.colorPickerFolderId
    });

    // 4. Drag & Drop
    const {
        dragOverId,
        setDragOverId,
        isExternalDragging,
        setIsExternalDragging,
        handleDragEnter,
        handleDragOver,
        handleDrop,
        handleInternalDrop
    } = useFileDragDrop(currentFolderId, actions.handleMoveToFolder);

    // 5. Context Menu
    const {
        contextMenu,
        handleContextMenu,
        closeContextMenu,
        menuItems
    } = useFileContextMenu({
        files,
        folders,
        selectedIds,
        setFilesToMove: dialogState.setFilesToMove,
        setMoveToFolderDialog: dialogState.setMoveToFolderDialog,
        setShareDialog: dialogState.setShareDialog,
        setNewFolderName: () => { },
        setRenameFolderDialog: dialogState.setRenameFolderDialog,
        setColorPickerFolderId: dialogState.setColorPickerFolderId,
        setNewFolderDialog: dialogState.setNewFolderDialog,
        handleDelete: actions.handleDeleteFile,
        handleDeleteFolder: actions.handleDeleteFolder,
        navigateToFolder: actions.navigateToFolder,
        setNotification: pageState.setNotification
    });

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
                showUpload={pageState.showUpload}
                onMassDelete={actions.handleMassDelete}
                onNewFolder={useCallback(() => dialogState.setNewFolderDialog(true), [dialogState])}
                onToggleUpload={useCallback(() => pageState.setShowUpload(prev => !prev), [pageState])}
                onMove={useCallback(() => {
                    dialogState.setFilesToMove(Array.from(selectedIds));
                    dialogState.setMoveToFolderDialog(true);
                }, [selectedIds, dialogState])}
            />

            <FilesToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCount={selectedIds.size}
                totalCount={files.length}
                onSelectAll={selectAll}
            />

            <FilesBreadcrumbs
                folderPath={folderPath}
                onNavigate={actions.navigateToFolder}
                dragOverId={dragOverId}
                setDragOverId={setDragOverId}
                onMove={(targetId, droppedFileId) => handleInternalDrop(targetId || '', droppedFileId, selectedIds)}
            />

            <FilesGrid
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                files={filteredFiles}
                folders={filteredFolders}
                viewPreset={pageState.viewPreset}
                selectedIds={selectedIds}
                downloadingId={downloadingId}
                deletingIds={pageState.deletingIds}
                hasMore={hasMore}
                onLoadMore={loadMore}

                onNavigate={actions.navigateToFolder}
                onFileClick={actions.handleFileClick}
                onContextMenu={handleContextMenu}
                onShare={(item) => dialogState.setShareDialog({ open: true, item, type: ('mimeType' in item) ? 'file' : 'folder' })}
                onDeleteFile={actions.handleDeleteFile}
                onDeleteFolder={actions.handleDeleteFolder}
                onDownload={handleDownload}
                onDragOver={setDragOverId}
                onDrop={(targetId, droppedId) => handleInternalDrop(targetId, droppedId, selectedIds)}
                onToggleSelect={toggleSelect}
                onMove={(file) => {
                    dialogState.setFilesToMove([file._id]);
                    dialogState.setMoveToFolderDialog(true);
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

            <FilesDialogs
                dialogState={dialogState}
                actions={actions}
                showUpload={pageState.showUpload}
                setShowUpload={pageState.setShowUpload}
                currentFolderId={currentFolderId}
                isDeleting={pageState.isDeleting}
            />

            <ImagePreviewOverlay
                key={pageState.previewOpen ? `preview-${pageState.previewInitialId}` : 'preview-closed'}
                isOpen={pageState.previewOpen}
                onClose={() => pageState.setPreviewOpen(false)}
                files={imageFiles}
                initialFileId={pageState.previewInitialId || ''}
            />

            <PDFPreviewOverlay
                isOpen={pageState.pdfPreviewOpen}
                onClose={() => {
                    pageState.setPdfPreviewOpen(false);
                    pageState.setPdfPreviewFile(null);
                }}
                file={pageState.pdfPreviewFile}
            />

            <Snackbar
                open={pageState.notification.open}
                autoHideDuration={4000}
                onClose={() => pageState.setNotification({ ...pageState.notification, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => pageState.setNotification({ ...pageState.notification, open: false })}
                    severity={pageState.notification.type}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
                >
                    {pageState.notification.message}
                </Alert>
            </Snackbar>
        </Stack>
    );
}

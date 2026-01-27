import {
    Dialog,
    DialogActions,
    DialogTitle,
    DialogContent,
    Button,
    Typography,
    alpha,
    useTheme
} from '@mui/material';


// Components
import UploadZone from '@/components/vault/UploadZone';
import { NewFolderDialog } from './dialogs/NewFolderDialog';
import { RenameFolderDialog } from './dialogs/RenameFolderDialog';
import { MoveToFolderDialog } from './dialogs/MoveToFolderDialog';
import { ColorPickerDialog } from './dialogs/ColorPickerDialog';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

// Hooks/Types
import { type useFilesDialogs } from '../hooks/useFilesDialogs';
import { type useFileActions } from '../hooks/useFileActions';

interface FilesDialogsProps {
    dialogState: ReturnType<typeof useFilesDialogs>;
    actions: ReturnType<typeof useFileActions>;
    showUpload: boolean;
    setShowUpload: (open: boolean) => void;
    currentFolderId: string | null;
    isDeleting: boolean;
}

export function FilesDialogs({
    dialogState,
    actions,
    showUpload,
    setShowUpload,
    currentFolderId,
    isDeleting
}: FilesDialogsProps) {
    const theme = useTheme();

    const {
        newFolderDialog,
        setNewFolderDialog,
        renameFolderDialog,
        setRenameFolderDialog,
        moveToFolderDialog,
        setMoveToFolderDialog,
        filesToMove,
        colorPickerFolderId,
        setColorPickerFolderId,
        shareDialog,
        setShareDialog,
        deleteConfirm,
        setDeleteConfirm
    } = dialogState;

    const {
        handleCreateFolder,
        handleRenameFolder,
        handleMoveToFolder,
        handleFolderColorChange,
        confirmDeleteFile,
        confirmMassDelete,
        confirmDeleteFolder
    } = actions;

    return (
        <>
            {/* Upload Modal Overlay */}
            <Dialog
                open={showUpload}
                onClose={() => setShowUpload(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: '24px',
                            bgcolor: alpha(theme.palette.background.paper, 0.98),
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            backgroundImage: 'none',
                            overflow: 'hidden'
                        }
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
        </>
    );
}

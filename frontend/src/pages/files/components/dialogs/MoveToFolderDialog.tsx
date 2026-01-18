import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography } from '@mui/material';
import { Home as HomeIcon, Folder as FolderIcon } from '@mui/icons-material';
import type { Folder } from '@/services/folderService';

interface MoveToFolderDialogProps {
    open: boolean;
    onClose: () => void;
    currentFolderId: string | null;
    folders: Folder[];
    fileCount: number;
    onMove: (targetFolderId: string | null) => void;
}

export function MoveToFolderDialog({
    open,
    onClose,
    currentFolderId,
    folders,
    fileCount,
    onMove
}: MoveToFolderDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ variant: 'translucent' as any }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Move {fileCount} file(s) to...</DialogTitle>
            <DialogContent>
                <Stack spacing={1} sx={{ mt: 1 }}>
                    {currentFolderId && (
                        <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<HomeIcon />}
                            onClick={() => onMove(null)}
                            sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                        >
                            Root (Home)
                        </Button>
                    )}
                    {folders.length === 0 && !currentFolderId && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No folders available. Create a folder first.
                        </Typography>
                    )}
                    {folders.map(folder => (
                        <Button
                            key={folder._id}
                            variant="outlined"
                            fullWidth
                            startIcon={<FolderIcon sx={{ color: 'warning.main' }} />}
                            onClick={() => onMove(folder._id)}
                            sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                        >
                            {folder.name}
                        </Button>
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}

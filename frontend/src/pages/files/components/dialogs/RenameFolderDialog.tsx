import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { useState, useEffect } from 'react';
import type { Folder } from '@/services/folderService';

interface RenameFolderDialogProps {
    open: boolean;
    folder: Folder | null;
    onClose: () => void;
    onRename: (newName: string) => void;
}

export function RenameFolderDialog({ open, folder, onClose, onRename }: RenameFolderDialogProps) {
    const [name, setName] = useState('');

    useEffect(() => {
        if (open && folder) {
            setName(folder.name);
        }
    }, [open, folder]);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onRename(name);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { variant: 'translucent' as any } }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Rename Folder</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Folder Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">Rename</Button>
            </DialogActions>
        </Dialog>
    );
}

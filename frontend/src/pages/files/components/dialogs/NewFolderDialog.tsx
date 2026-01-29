import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { useState } from 'react';

interface NewFolderDialogProps {
    open: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export function NewFolderDialog({ open, onClose, onCreate }: NewFolderDialogProps) {
    const [name, setName] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) return;
        onCreate(name);
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                setName('');
                onClose();
            }}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { variant: 'solid' as const, sx: { borderRadius: '24px' } } }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Create New Folder</DialogTitle>
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
                <Button onClick={handleSubmit} variant="contained">Create</Button>
            </DialogActions>
        </Dialog>
    );
}

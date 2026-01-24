import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField
} from '@mui/material';

interface FolderDialogProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'rename';
    initialValue?: string;
    onConfirm: (name: string) => Promise<void>;
}

export const FolderDialog: React.FC<FolderDialogProps> = ({
    open,
    onClose,
    mode,
    initialValue = '',
    onConfirm
}) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (open) {
            setValue(initialValue);
        }
    }, [open, initialValue]);

    const handleConfirm = async () => {
        if (!value.trim()) return;
        await onConfirm(value);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{mode === 'create' ? 'New Folder' : 'Rename Folder'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Folder Name"
                    fullWidth
                    variant="outlined"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirm();
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleConfirm} variant="contained">
                    {mode === 'create' ? 'Create' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

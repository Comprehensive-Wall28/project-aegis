import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button
} from '@mui/material';

interface DeleteConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    mode: 'note' | 'folder';
    title: string;
    onConfirm: () => Promise<void>;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
    open,
    onClose,
    mode,
    title,
    onConfirm
}) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Delete {mode === 'note' ? 'Note' : 'Folder'}?</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to delete "{title}"?
                    {mode === 'folder' && ' All notes within this folder will strictly not be deleted.'}
                    This action cannot be undone.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={onConfirm} color="error" variant="contained">
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
};

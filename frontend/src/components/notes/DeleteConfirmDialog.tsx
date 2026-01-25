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
                    Are you sure you want to delete <strong>"{title}"</strong>?
                    <br /><br />
                    {mode === 'folder' && (
                        <>
                            Notes within this folder will <strong>not</strong> be deleted (they will be moved to 'All Notes').
                            <br /><br />
                        </>
                    )}
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

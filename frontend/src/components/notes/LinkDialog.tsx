import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box
} from '@mui/material';

interface LinkDialogProps {
    open: boolean;
    onClose: () => void;
    initialUrl?: string;
    initialText?: string;
    onConfirm: (url: string, text: string) => void;
}

export const LinkDialog: React.FC<LinkDialogProps> = ({
    open,
    onClose,
    initialUrl = '',
    initialText = '',
    onConfirm
}) => {
    const [url, setUrl] = useState(initialUrl);
    const [text, setText] = useState(initialText);

    useEffect(() => {
        if (open) {
            setUrl(initialUrl);
            setText(initialText);
        }
    }, [open, initialUrl, initialText]);

    const handleConfirm = () => {
        onConfirm(url, text);
        // Reset local state handled by effect on next open, but nice to clear.
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            sx={{ zIndex: 11000 }}
            slotProps={{
                paper: {
                    sx: { borderRadius: '16px', width: '100%', maxWidth: 400 }
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Add/Edit Link</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Set the link destination and display text.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Display Text"
                        placeholder="e.g. Click here"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirm();
                            }
                        }}
                        variant="outlined"
                    />
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        label="URL"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirm();
                            }
                        }}
                        variant="outlined"
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    sx={{ borderRadius: '8px' }}
                >
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    );
};

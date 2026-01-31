import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    CircularProgress,
    Alert
} from '@mui/material';
import { Share as ShareIcon } from '@mui/icons-material';
import apiClient from '@/services/api';
import { useFolderKeyStore } from '@/stores/useFolderKeyStore';
import { encapsulateFolderKey } from '@/lib/cryptoUtils';

interface ShareFolderDialogProps {
    open: boolean;
    onClose: () => void;
    folderId: string;
    folderName: string;
}

export const ShareFolderDialog: React.FC<ShareFolderDialogProps> = ({
    open,
    onClose,
    folderId,
    folderName
}) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleShare = async () => {
        if (!email.trim()) return;

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // 1. Discover Recipient's PQC Public Key
            const discoveryResponse = await apiClient.get(`/auth/discovery/${encodeURIComponent(email.trim())}`);
            const { pqcPublicKey } = discoveryResponse.data;

            if (!pqcPublicKey) {
                throw new Error('Recipient has not initialized PQC keys.');
            }

            // 2. Get Folder Key (Ensures it's decrypted in memory)
            const folderKey = await useFolderKeyStore.getState().getOrFetchKey(folderId);

            // 3. Encapsulate Folder Key using Recipient's Public Key
            const encryptedSharedKey = await encapsulateFolderKey(pqcPublicKey, folderKey);

            // 4. Send Invite
            await apiClient.post('/share/invite', {
                id: folderId,
                email: email.trim(),
                encryptedSharedKey,
                permissions: ['READ', 'DOWNLOAD']
            });

            setSuccess(true);
            setEmail('');
            // Optional: onClose after a delay or let user see success
        } catch (err: unknown) {
            console.error('Sharing failed:', err);
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            setError(error.response?.data?.message || error.message || 'Failed to share folder');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShareIcon color="primary" />
                Share "{folderName}"
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enter the email of the person you want to share this folder with.
                        They must have an Aegis account.
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    )}

                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>Folder shared successfully!</Alert>
                    )}

                    <TextField
                        fullWidth
                        label="Recipient Email"
                        variant="outlined"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading || success}
                        autoFocus
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={isLoading}>
                    {success ? 'Close' : 'Cancel'}
                </Button>
                {!success && (
                    <Button
                        onClick={handleShare}
                        variant="contained"
                        disabled={isLoading || !email.trim()}
                        startIcon={isLoading ? <CircularProgress size={20} /> : <ShareIcon />}
                    >
                        Share Securely
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

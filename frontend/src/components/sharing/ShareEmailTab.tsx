import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    Alert,
    CircularProgress,
    Stack
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import apiClient from '@/services/api';
import { useSessionStore } from '@/stores/sessionStore';
import { useFolderKeyStore } from '@/stores/useFolderKeyStore';
import { unwrapKey, encapsulateFolderKey } from '@/lib/cryptoUtils';
import type { FileMetadata } from '@/services/vaultService';
import type { Folder } from '@/services/folderService';

interface ShareEmailTabProps {
    item: FileMetadata | Folder;
    type: 'file' | 'folder';
    onSuccess?: () => void;
}

export const ShareEmailTab: React.FC<ShareEmailTabProps> = ({ item, type, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleShare = async () => {
        if (!email.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const { user } = useSessionStore.getState();
            if (!user || !user.vaultKey) throw new Error('Vault keys not ready');

            // 1. Discover Recipient's PQC Public Key
            const discoveryResponse = await apiClient.get(`/auth/discovery/${encodeURIComponent(email.trim())}`);
            const { pqcPublicKey } = discoveryResponse.data;

            if (!pqcPublicKey) {
                throw new Error('Recipient has not initialized PQC keys (Account not found or not setup).');
            }

            let resourceKey: CryptoKey;

            // 2. Resolve Resource Key
            if (type === 'file') {
                const file = item as FileMetadata;
                let wrappingKey = user.vaultKey;

                if (file.encapsulatedKey === 'FOLDER' && file.folderId) {
                    wrappingKey = await useFolderKeyStore.getState().getOrFetchKey(file.folderId);
                }

                if (file.encryptedSymmetricKey === 'GLOBAL') {
                    throw new Error('Cannot share files encrypted with legacy Global Key mode securely.');
                }

                resourceKey = await unwrapKey(file.encryptedSymmetricKey, wrappingKey);
            } else {
                const folder = item as Folder;
                resourceKey = await useFolderKeyStore.getState().getOrFetchKey(folder._id);
            }

            // 3. Encapsulate Key for Recipient
            const encryptedSharedKey = await encapsulateFolderKey(pqcPublicKey, resourceKey);

            // 4. Send Invite
            const endpoint = type === 'file' ? '/share/invite-file' : '/share/invite';
            const payload = type === 'file' ? {
                fileId: item._id,
                email: email.trim(),
                encryptedSharedKey
            } : {
                folderId: item._id,
                email: email.trim(),
                encryptedSharedKey
            };

            await apiClient.post(endpoint, payload);

            setSuccessMsg(`Successfully shared ${type} with ${email}`);
            setEmail('');
            if (onSuccess) onSuccess();

        } catch (err: any) {
            console.error('Sharing failed:', err);
            setError(err.response?.data?.message || err.message || 'Failed to share');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the email address of the person you want to share this {type} with.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

            <Stack direction="row" spacing={1}>
                <TextField
                    fullWidth
                    label="Recipient Email"
                    size="small"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                />
                <Button
                    variant="contained"
                    onClick={handleShare}
                    disabled={isLoading || !email.trim()}
                    endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    sx={{ minWidth: 100 }}
                >
                    Share
                </Button>
            </Stack>
        </Box>
    );
};

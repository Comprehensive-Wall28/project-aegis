import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Box,
    Button,
    Typography,
    TextField,
    Alert,
    CircularProgress,
    IconButton,
    Tooltip,
    Stack,
    useTheme,
    alpha
} from '@mui/material';
import { ContentCopy as CopyIcon, Link as LinkIcon, Refresh as RefreshIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import apiClient from '@/services/api';
import { useSessionStore } from '@/stores/sessionStore';
import { useFolderKeyStore } from '@/stores/useFolderKeyStore';
import { wrapKey, unwrapKey, generateFolderKey, bytesToHex } from '@/lib/cryptoUtils';
import type { FileMetadata } from '@/services/vaultService';
import type { Folder } from '@/services/folderService';

interface ShareLinkTabProps {
    item: FileMetadata | Folder;
    type: 'file' | 'folder';
}

export const ShareLinkTab: React.FC<ShareLinkTabProps> = ({ item, type }) => {
    const theme = useTheme();
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generateLink = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedLink(null);
        setCopied(false);
        try {
            const { user } = useSessionStore.getState();
            if (!user || !user.vaultKey) throw new Error('Vault keys not ready');

            let resourceKey: CryptoKey;

            // 1. Resolve Resource Key (DEK for file, SessionKey for folder)
            if (type === 'file') {
                const file = item as FileMetadata;
                let wrappingKey = user.vaultKey;

                if (file.encapsulatedKey === 'FOLDER' && file.folderId) {
                    wrappingKey = await useFolderKeyStore.getState().getOrFetchKey(file.folderId);
                }

                if (file.encryptedSymmetricKey === 'GLOBAL') {
                    const params = useSessionStore.getState();
                    // @ts-ignore
                    resourceKey = params.vaultCtrKey; // Global mode

                    if (file.encryptedSymmetricKey === 'GLOBAL') {
                        throw new Error('Cannot share files encrypted with legacy Global Key mode securely.');
                    }
                }

                // Unwrap DEK
                resourceKey = await unwrapKey(file.encryptedSymmetricKey, wrappingKey);

            } else {
                // Folder logic
                const folder = item as Folder;
                resourceKey = await useFolderKeyStore.getState().getOrFetchKey(folder._id);
            }

            // 2. Generate Link Key (Client-side, ephemeral, goes in URL hash)
            const linkKey = await generateFolderKey(); // Just a random 256-bit key

            // 3. Encrypt Resource Key with Link Key
            const encryptedResourceKey = await wrapKey(resourceKey, linkKey);

            // 4. Send to Backend
            const response = await apiClient.post('/share/link', {
                resourceId: item._id,
                resourceType: type,
                encryptedKey: encryptedResourceKey,
                isPublic: true // For now default to public
            });

            const { token } = response.data;
            const linkKeyRaw = await crypto.subtle.exportKey('raw', linkKey);
            const link = `${window.location.origin}/share/view/${token}#${bytesToHex(new Uint8Array(linkKeyRaw))}`;

            setGeneratedLink(link);

        } catch (err: any) {
            console.error('Link generation failed:', err);
            setError(err.message || 'Failed to generate link');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Anyone with this link can view and download this {type}.
                {type === 'folder' && ' They will have access to all files inside.'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!generatedLink ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Button
                        variant="contained"
                        onClick={generateLink}
                        disabled={isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LinkIcon />}
                        sx={{ borderRadius: '12px', px: 4, py: 1.5 }}
                    >
                        {isLoading ? 'Generating Safe Link...' : 'Create Public Link'}
                    </Button>
                </Box>
            ) : (
                <Box>
                    <Box sx={{
                        mb: 2,
                        p: 1.5,
                        borderRadius: '12px',
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                        textAlign: 'center'
                    }}>
                        <Typography variant="caption" sx={{ color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, fontWeight: 600 }}>
                            Manage or revoke this link anytime in
                            <Button
                                component={Link}
                                to="/dashboard/security?tab=security"
                                size="small"
                                sx={{
                                    textTransform: 'none',
                                    p: 0,
                                    px: 0.5,
                                    minWidth: 'auto',
                                    verticalAlign: 'baseline',
                                    fontWeight: 700,
                                    color: 'warning.main',
                                    '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                                }}
                            >
                                Security Settings
                            </Button>
                        </Typography>
                    </Box>

                    <TextField
                        fullWidth
                        value={generatedLink}
                        variant="outlined"
                        InputProps={{
                            readOnly: true,
                            endAdornment: (
                                <Tooltip title={copied ? 'Copied!' : 'Copy to Clipboard'}>
                                    <IconButton
                                        onClick={copyToClipboard}
                                        edge="end"
                                        sx={{
                                            color: copied ? 'success.main' : 'inherit',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {copied ? <CheckCircleIcon /> : <CopyIcon />}
                                    </IconButton>
                                </Tooltip>
                            )
                        }}
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                                transition: 'all 0.3s',
                                borderColor: copied ? 'success.main' : 'inherit',
                                '& fieldset': {
                                    borderColor: copied ? 'success.main' : 'inherit',
                                    borderWidth: copied ? '2px' : '1px'
                                },
                                '&:hover fieldset': {
                                    borderColor: copied ? 'success.main' : 'primary.main',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: copied ? 'success.main' : 'primary.main',
                                }
                            }
                        }}
                    />
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        spacing={2}
                    >
                        <Button
                            size="small"
                            onClick={generateLink} // Regenerate
                            startIcon={<RefreshIcon />}
                            sx={{
                                textTransform: 'none',
                                color: 'text.secondary',
                                fontWeight: 600
                            }}
                        >
                            Generate New Link
                        </Button>
                        {copied && (
                            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                                Link copied to clipboard!
                            </Typography>
                        )}
                    </Stack>
                </Box>
            )}
        </Box>
    );
};


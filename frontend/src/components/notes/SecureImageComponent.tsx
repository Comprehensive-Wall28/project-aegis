import React, { useEffect, useState, useRef } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Box, CircularProgress, Typography, alpha, useTheme } from '@mui/material';
import { BrokenImage as BrokenImageIcon } from '@mui/icons-material';
import { useVaultDownload } from '../../hooks/useVaultDownload';
import vaultService from '../../services/vaultService';

export const SecureImageComponent: React.FC<NodeViewProps> = ({ node }) => {
    const { fileId, width, height, alignment, alt } = node.attrs;
    const theme = useTheme();
    const { downloadAndDecrypt } = useVaultDownload();
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        const loadImage = async () => {
            if (!fileId) return;

            try {
                setIsLoading(true);
                setError(null);

                // 1. Fetch metadata to get keys
                const metadata = await vaultService.getFile(fileId);

                // 2. Download and decrypt
                const blob = await downloadAndDecrypt(metadata);

                if (blob && isMounted.current) {
                    const url = URL.createObjectURL(blob);
                    setBlobUrl(url);
                }
            } catch (err: any) {
                console.error('Failed to load secure image:', err);
                if (isMounted.current) {
                    setError(err.message || 'Failed to decrypt image');
                }
            } finally {
                if (isMounted.current) {
                    setIsLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [fileId]);

    // Cleanup blob URL on unmount or fileId change
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    const justifyContent = alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center';

    return (
        <NodeViewWrapper style={{ display: 'flex', justifyContent, width: '100%', margin: '1rem 0' }}>
            <Box
                sx={{
                    position: 'relative',
                    width: width === 'auto' ? 'fit-content' : width,
                    height: height === 'auto' ? 'auto' : height,
                    minWidth: 100,
                    minHeight: 100,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    bgcolor: alpha(theme.palette.action.hover, 0.05),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: error ? `1px solid ${theme.palette.error.main}` : 'none',
                    boxShadow: blobUrl ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                }}
            >
                {isLoading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={32} />
                        <Typography variant="caption" color="text.secondary">Decrypting...</Typography>
                    </Box>
                )}

                {error && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: 2, textAlign: 'center' }}>
                        <BrokenImageIcon color="error" />
                        <Typography variant="caption" color="error">{error}</Typography>
                    </Box>
                )}

                {blobUrl && !isLoading && !error && (
                    <img
                        src={blobUrl}
                        alt={alt || 'Secure Note Image'}
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            display: 'block',
                            borderRadius: '12px',
                        }}
                    />
                )}
            </Box>
        </NodeViewWrapper>
    );
};

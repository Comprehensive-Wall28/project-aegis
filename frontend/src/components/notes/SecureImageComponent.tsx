import React, { useEffect, useState, useRef } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Box, CircularProgress, Typography, alpha, useTheme } from '@mui/material';
import { BrokenImage as BrokenImageIcon } from '@mui/icons-material';
import { useVaultDownload } from '../../hooks/useVaultDownload';
import vaultService from '../../services/vaultService';
import noteMediaService from '../../services/noteMediaService';
import { blobCache } from '../../lib/blobCache';

export const SecureImageComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
    const { fileId, mediaId, width, height, alignment, alt } = node.attrs;
    const theme = useTheme();
    const { downloadAndDecrypt } = useVaultDownload();
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);
    const blobUrlRef = useRef<string | null>(null);
    const isOwnedUrl = useRef(false); // Whether this component instance created the Object URL
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // Final cleanup on unmount - ONLY if we own the URL
            if (isOwnedUrl.current && blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const loadImage = async () => {
            const id = (mediaId || fileId) as string;
            if (!id) return;

            // 1. Check Cache for instant rendering
            const cachedUrl = blobCache.get(id);
            if (cachedUrl) {
                setBlobUrl(cachedUrl);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                let blob: Blob | null = null;

                if (mediaId) {
                    // Note Media (GridFS) flow
                    const metadata = await noteMediaService.getMedia(mediaId);
                    const downloadUrl = noteMediaService.getDownloadUrl(mediaId);
                    blob = await downloadAndDecrypt(metadata, downloadUrl);
                } else {
                    // Vault (Google Drive) legacy flow
                    const metadata = await vaultService.getFile(id);
                    blob = await downloadAndDecrypt(metadata);
                }

                if (blob && isMounted.current) {
                    const url = URL.createObjectURL(blob);

                    // Cleanup previous OWNED URL if it exists
                    if (isOwnedUrl.current && blobUrlRef.current) {
                        URL.revokeObjectURL(blobUrlRef.current);
                    }

                    blobUrlRef.current = url;
                    isOwnedUrl.current = true;
                    setBlobUrl(url);

                    // Add to cache for others
                    blobCache.set(id, url);
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
    }, [fileId, mediaId]);

    const handleResize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = boxRef.current?.offsetWidth || 0;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.clientX;
            const newWidth = Math.max(100, startWidth + (currentX - startX));
            updateAttributes({ width: newWidth });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const justifyContent = alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center';

    return (
        <NodeViewWrapper style={{ display: 'flex', justifyContent, width: '100%', margin: '1rem 0' }}>
            <Box
                ref={boxRef}
                sx={{
                    position: 'relative',
                    width: width === 'auto' ? 'fit-content' : width,
                    height: height === 'auto' ? 'auto' : height,
                    minWidth: 100,
                    minHeight: 100,
                    borderRadius: '12px',
                    overflow: 'visible',
                    bgcolor: alpha(theme.palette.action.hover, 0.05),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: error
                        ? `1px solid ${theme.palette.error.main}`
                        : (selected ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent'),
                    boxShadow: blobUrl ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                    transition: 'border 0.2s ease',
                    userSelect: 'none',
                    '&:hover': {
                        border: !error && !selected ? `1px solid ${alpha(theme.palette.primary.main, 0.5)}` : undefined,
                    }
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

                {/* Resize Handle */}
                {selected && (
                    <Box
                        onMouseDown={handleResize}
                        sx={{
                            position: 'absolute',
                            bottom: -5,
                            right: -5,
                            width: 12,
                            height: 12,
                            bgcolor: 'primary.main',
                            borderRadius: '50%',
                            cursor: 'nwse-resize',
                            border: `2px solid ${theme.palette.background.paper}`,
                            boxShadow: theme.shadows[2],
                            zIndex: 10,
                        }}
                    />
                )}
            </Box>
        </NodeViewWrapper>
    );
};

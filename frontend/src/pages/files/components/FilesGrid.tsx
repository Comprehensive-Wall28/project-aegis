import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, CircularProgress, Grid, useTheme, useMediaQuery } from '@mui/material';
import { FolderOpen as FolderOpenIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import type { FileMetadata } from '@/services/vaultService';
import type { Folder } from '@/services/folderService';
import type { ViewPreset, GridSizeConfig, IconScalingConfig, TypoScalingConfig, ContextMenuTarget } from '../types';
import { FolderGridItem } from './FolderGridItem';
import { FileGridItem } from './FileGridItem';


interface FilesGridProps {
    isLoading: boolean;
    files: FileMetadata[];
    folders: Folder[];
    viewPreset: ViewPreset;
    selectedIds: Set<string>;
    downloadingId: string | null;
    deletingIds: Set<string>;
    currentFolderId: string | null;
    onNavigate: (folder: Folder) => void;
    onFileClick: (file: FileMetadata, e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void;
    onShare: (item: FileMetadata | Folder) => void;
    onDeleteFile: (id: string) => void;
    onDeleteFolder: (id: string) => void;
    onDownload: (file: FileMetadata) => void;
    onDragOver: (id: string | null) => void;
    onDrop: (targetId: string, droppedFileId: string) => void;
    onToggleSelect: (id: string) => void;
    onMove: (file: FileMetadata) => void;
    dragOverId: string | null;
}

export function FilesGrid({
    isLoading,
    files,
    folders,
    viewPreset,
    selectedIds,
    downloadingId,
    deletingIds,
    currentFolderId,
    onNavigate,
    onFileClick,
    onContextMenu,
    onShare,
    onDeleteFile,
    onDeleteFolder,
    onDownload,
    onDragOver,
    onDrop,
    onToggleSelect,
    onMove,
    dragOverId
}: FilesGridProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [displayLimit, setDisplayLimit] = useState(20);
    const [sentinelNode, setSentinelNode] = useState<HTMLElement | null>(null);

    // Reset limit when folder changes
    useEffect(() => {
        setDisplayLimit(20);
    }, [currentFolderId]);

    useEffect(() => {
        if (!sentinelNode) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setDisplayLimit(prev => prev + 15);
            }
        }, { threshold: 0.1, rootMargin: '200px' });

        observer.observe(sentinelNode);
        return () => observer.disconnect();
    }, [sentinelNode, displayLimit]);

    const gridSize = useMemo<GridSizeConfig>(() => {
        switch (viewPreset) {
            case 'compact': return { xs: 6, sm: 4, md: 3, lg: 2 };
            case 'comfort': return { xs: 12, sm: 6, md: 4, lg: 3 };
            case 'detailed': return { xs: 12, sm: 12, md: 6, lg: 4 };
            default: return { xs: 6, sm: 4, md: 3, lg: 2.4 };
        }
    }, [viewPreset]);

    const iconScaling = useMemo<IconScalingConfig>(() => {
        switch (viewPreset) {
            case 'compact': return { size: 48, padding: 1.5, badge: 14 };
            case 'comfort': return { size: 80, padding: 2.5, badge: 20 };
            case 'detailed': return { size: 64, padding: 3.5, badge: 24 };
            default: return { size: 64, padding: 2, badge: 18 };
        }
    }, [viewPreset]);

    const typoScaling = useMemo<TypoScalingConfig>(() => {
        switch (viewPreset) {
            case 'compact': return { name: 'caption', size: 11, mb: 0.5 };
            case 'comfort': return { name: 'body1', size: 24, mb: 1 };
            case 'detailed': return { name: 'h6', size: 30, mb: 1.5 };
            default: return { name: 'body2', size: 16, mb: 1 };
        }
    }, [viewPreset]);

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <Box
                        key="loading"
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, width: '100%', opacity: 0.5 }}
                    >
                        <CircularProgress thickness={5} size={32} />
                        <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 800, mt: 2, letterSpacing: 1.5, fontFamily: 'JetBrains Mono' }}>
                            RESOLVING_VAULT_METADATA
                        </Typography>
                    </Box>
                ) : (files.length === 0 && folders.length === 0) ? (
                    <Box
                        key="empty"
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center', width: '100%', opacity: 0.7 }}
                    >
                        <FolderOpenIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.1, mb: 2 }} />
                        <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 800, mb: 1 }}>
                            Your vault is empty
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, fontWeight: 500 }}>
                            Drag and drop files here or use the "New" button to get started.
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Grid
                            container
                            spacing={2}
                            key="grid"
                        >
                            {folders.map((folder) => (
                                <FolderGridItem
                                    key={`folder-${folder._id}`}
                                    folder={folder}
                                    gridSize={gridSize}
                                    iconScaling={iconScaling}
                                    typoScaling={typoScaling}
                                    dragOverId={dragOverId}
                                    onNavigate={onNavigate}
                                    onContextMenu={onContextMenu}
                                    onShare={onShare}
                                    onDelete={onDeleteFolder}
                                    onDragOver={onDragOver}
                                    onDrop={onDrop}
                                    isMobile={isMobile}
                                />
                            ))}

                            {files.slice(0, displayLimit).map((file) => (
                                <FileGridItem
                                    key={file._id}
                                    file={file}
                                    gridSize={gridSize}
                                    iconScaling={iconScaling}
                                    typoScaling={typoScaling}
                                    isSelected={selectedIds.has(file._id)}
                                    isDownloading={downloadingId === file._id}
                                    isDeleting={deletingIds.has(file._id)}
                                    onFileClick={onFileClick}
                                    onContextMenu={onContextMenu}
                                    onDownload={onDownload}
                                    onDelete={onDeleteFile}
                                    onToggleSelect={onToggleSelect}
                                    onMove={onMove}
                                    isMobile={isMobile}
                                    selectedCount={selectedIds.size}
                                />
                            ))}
                        </Grid>
                        {files.length > displayLimit && (
                            <Box ref={setSentinelNode} sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                                <CircularProgress size={24} />
                            </Box>
                        )}
                    </>
                )}
            </AnimatePresence>
        </Box >
    );
}

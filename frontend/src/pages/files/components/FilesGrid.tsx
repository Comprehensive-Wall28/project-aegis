import { useMemo } from 'react';
import { Box, Typography, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { FolderOpen as FolderOpenIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import type { FileMetadata } from '@/services/vaultService';
import type { Folder } from '@/services/folderService';
import type { ViewPreset, IconScalingConfig, TypoScalingConfig, ContextMenuTarget } from '../types';
import { FolderGridItem } from './FolderGridItem';
import { FileGridItem } from './FileGridItem';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface FilesGridProps {
    isLoading: boolean;
    isLoadingMore?: boolean;
    files: FileMetadata[];
    folders: Folder[];
    viewPreset: ViewPreset;
    selectedIds: Set<string>;
    downloadingId: string | null;
    deletingIds: Set<string>;
    hasMore?: boolean;
    onLoadMore?: () => void;

    onNavigate: (folder: Folder) => void;
    onFileClick: (file: FileMetadata, e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void;
    onDeleteFile: (id: string) => void;
    onDeleteFolder: (id: string) => void;
    onDownload: (file: FileMetadata) => void;
    onDragOver: (id: string | null) => void;
    onDrop: (targetId: string, droppedFileId: string) => void;
    onToggleSelect: (id: string) => void;
    onMove: (file: FileMetadata) => void;
    dragOverId: string | null;
    highlightId?: string | null;
}

export function FilesGrid({
    isLoading,
    isLoadingMore = false,
    files,
    folders,
    viewPreset,
    selectedIds,
    downloadingId,
    deletingIds,
    hasMore = false,
    onLoadMore = () => { },
    onNavigate,
    onFileClick,
    onContextMenu,
    onDeleteFile,
    onDeleteFolder,
    onDownload,
    onDragOver,
    onDrop,
    onToggleSelect,
    onMove,
    dragOverId,
    highlightId
}: FilesGridProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const gridSize = useMemo<Record<string, number>>(() => {
        switch (viewPreset) {
            case 'compact': return { xs: 100, sm: 25, md: 20, lg: 14.28 };     // 1, 4, 5, 7 items
            case 'comfort': return { xs: 100, sm: 50, md: 33.33, lg: 25 };     // 1, 2, 3, 4 items
            case 'detailed': return { xs: 100, sm: 100, md: 50, lg: 33.33 };   // 1, 1, 2, 3 items
            case 'standard': return { xs: 100, sm: 33.33, md: 25, lg: 20 };    // 1, 3, 4, 5 items
            case 'gallery': return { xs: 100, sm: 50, md: 33.33, lg: 25 };     // Added gallery support
            default: return { xs: 100, sm: 33.33, md: 25, lg: 20 };
        }
    }, [viewPreset]);

    const iconScaling = useMemo<IconScalingConfig>(() => {
        switch (viewPreset) {
            case 'compact': return { size: 32, padding: 0.75, badge: 10 };
            case 'comfort': return { size: 64, padding: 1.75, badge: 16 };
            case 'detailed': return { size: 52, padding: 2.5, badge: 20 };
            case 'gallery': return { size: 80, padding: 2, badge: 18 };
            default: return { size: 48, padding: 1.5, badge: 14 };
        }
    }, [viewPreset]);

    const typoScaling = useMemo<TypoScalingConfig>(() => {
        switch (viewPreset) {
            case 'compact': return { name: 'body2', size: 14, mb: 0.5 };
            case 'comfort': return { name: 'h6', size: 28, mb: 1.5 };
            case 'detailed': return { name: 'h5', size: 34, mb: 2 };
            case 'gallery': return { name: 'body1', size: 16, mb: 1 };
            default: return { name: 'body1', size: 18, mb: 1 };
        }
    }, [viewPreset, isMobile]);

    // Unified data set
    const allData = useMemo(() => {
        return [
            ...folders.map(f => ({ type: 'folder' as const, data: f })),
            ...files.map(f => ({ type: 'file' as const, data: f }))
        ];
    }, [folders, files]);

    const { sentinelRef } = useInfiniteScroll({
        hasMore,
        isLoading: isLoadingMore,
        onLoadMore
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
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
                ) : (allData.length === 0) ? (
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
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: `repeat(${Math.floor(100 / gridSize.xs)}, 1fr)`,
                                sm: `repeat(${Math.floor(100 / gridSize.sm)}, 1fr)`,
                                md: `repeat(${Math.floor(100 / gridSize.md)}, 1fr)`,
                                lg: `repeat(${Math.floor(100 / gridSize.lg)}, 1fr)`
                            },
                            gap: 2,
                            p: 2,
                            width: '100%'
                        }}
                    >
                        {allData.map((item) => {
                            if (item.type === 'folder') {
                                const folder = item.data as Folder;
                                return (
                                    <Box
                                        key={`folder-${folder._id}`}
                                        sx={{
                                            aspectRatio: '1/1',
                                            minWidth: 0,
                                            contentVisibility: 'auto',
                                            containIntrinsicBlockSize: '200px'
                                        }}
                                    >
                                        <FolderGridItem
                                            folder={folder}
                                            iconScaling={iconScaling}
                                            typoScaling={typoScaling}
                                            dragOverId={dragOverId}
                                            onNavigate={onNavigate}
                                            onContextMenu={onContextMenu}
                                            onDelete={onDeleteFolder}
                                            onDragOver={onDragOver}
                                            onDrop={onDrop}
                                        />
                                    </Box>
                                );
                            } else {
                                const file = item.data as FileMetadata;
                                return (
                                    <Box
                                        key={`file-${file._id}`}
                                        sx={{
                                            aspectRatio: '1/1',
                                            minWidth: 0,
                                            contentVisibility: 'auto',
                                            containIntrinsicBlockSize: '200px'
                                        }}
                                    >
                                        <FileGridItem
                                            file={file}
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
                                            selectedCount={selectedIds.size}
                                            isHighlighted={highlightId === file._id}
                                        />
                                    </Box>
                                );
                            }
                        })}

                        {/* Infinite scroll sentinel */}
                        {hasMore && (
                            <Box
                                ref={sentinelRef}
                                sx={{
                                    gridColumn: '1 / -1',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    py: 3,
                                    gap: 1,
                                }}
                            >
                                <CircularProgress size={20} thickness={4} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    {isLoadingMore ? 'Loading more...' : 'Load more'}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </AnimatePresence>
        </Box>
    );
}

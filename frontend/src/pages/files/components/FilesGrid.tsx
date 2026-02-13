import { useMemo } from 'react';
import { Box, Paper, Typography, CircularProgress, useTheme, useMediaQuery, alpha, IconButton } from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import type { FileMetadata } from '@/services/vaultService';
import type { Folder } from '@/services/folderService';
import type { ViewPreset, IconScalingConfig, TypoScalingConfig, ContextMenuTarget } from '../types';
import { FolderGridItem } from './FolderGridItem';
import { FileGridItem } from './FileGridItem';
import { FolderListItem } from './FolderListItem';
import { FileListItem } from './FileListItem';
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
    onRenameFolder: (folder: Folder) => void;
    onChangeFolderColor: (folder: Folder) => void;
    onDownload: (file: FileMetadata) => void;
    onDragOver: (id: string | null) => void;
    onDrop: (targetId: string, droppedFileId: string) => void;
    onToggleSelect: (id: string) => void;
    onMove: (file: FileMetadata) => void;
    dragOverId: string | null;
    highlightId?: string | null;
    searchQuery?: string;
    // Sort
    sortField?: 'createdAt' | 'fileSize' | 'originalFileName';
    sortOrder?: 'asc' | 'desc';
    onSortChange?: (field: 'createdAt' | 'fileSize' | 'originalFileName') => void;
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
    onRenameFolder,
    onChangeFolderColor,
    onDownload,
    onDragOver,
    onDrop,
    onToggleSelect,
    onMove,
    dragOverId,
    highlightId,
    searchQuery,
    sortField = 'createdAt',
    sortOrder = 'desc',
    onSortChange
}: FilesGridProps) {
    const theme = useTheme();
    const navigate = useNavigate();
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
         
    }, [viewPreset]);

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

    const LoadingState = (
        <Box
            key="loading"
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, width: '100%', opacity: 0.5, minHeight: 200 }}
        >
            <CircularProgress thickness={5} size={32} />
            <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 800, mt: 2, letterSpacing: 1.5, fontFamily: 'JetBrains Mono' }}>
                RESOLVING_VAULT_METADATA
            </Typography>
        </Box>
    );

    const EmptyState = (
        <Box
            key="empty"
            component={motion.div}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center', width: '100%', opacity: 0.7, minHeight: 200 }}
        >
            <FolderOpenIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.1, mb: 2 }} />
            <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 800, mb: 1 }}>
                {searchQuery ? 'No results found' : 'Your vault is empty'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, fontWeight: 500 }}>
                {searchQuery ? `No files matching "${searchQuery}"` : 'Drag and drop files here or use the "New" button to get started.'}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
                {viewPreset === 'list' ? (
                    <Paper
                        key="list-view"
                        elevation={1}
                        sx={{
                            borderRadius: isMobile ? '20px' : '24px',
                            bgcolor: 'background.paper',
                            flex: 1,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* List Header - hidden on mobile */}
                        {!isMobile && (
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`, gap: 2 }}>
                                {/* Back Button - aligns above checkboxes */}
                                <Box sx={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => navigate(-1)}
                                        title="Back"
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            color: 'text.secondary',
                                            bgcolor: alpha(theme.palette.text.primary, 0.04),
                                            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.08) },
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <ArrowBackIcon sx={{ fontSize: '1.1rem' }} />
                                    </IconButton>
                                </Box>

                                <Box sx={{ width: 40, flexShrink: 0 }} /> {/* Icon spacer */}

                                {/* Name Header */}
                                <Box
                                    sx={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        transition: 'opacity 0.2s',
                                        '&:hover': { opacity: 0.8 },
                                        '&:hover .MuiTypography-root': { color: 'text.primary' }
                                    }}
                                    onClick={() => onSortChange?.('originalFileName')}
                                >
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: sortField === 'originalFileName' ? 'primary.main' : 'text.secondary', fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase', transition: 'color 0.2s' }}>
                                        Name
                                    </Typography>
                                    {sortField === 'originalFileName' && (
                                        <Typography variant="caption" sx={{ ml: 0.5, color: 'primary.main', fontWeight: 800 }}>
                                            {sortOrder === 'asc' ? '↑' : '↓'}
                                        </Typography>
                                    )}
                                </Box>

                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', width: 80, flexShrink: 0, fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase', display: { xs: 'none', sm: 'block' } }}>
                                    Type
                                </Typography>

                                {/* Size Header */}
                                <Box
                                    sx={{
                                        width: 80,
                                        flexShrink: 0,
                                        display: { xs: 'none', md: 'flex' },
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        transition: 'opacity 0.2s',
                                        '&:hover': { opacity: 0.8 },
                                        '&:hover .MuiTypography-root': { color: 'text.primary' }
                                    }}
                                    onClick={() => onSortChange?.('fileSize')}
                                >
                                    {sortField === 'fileSize' && (
                                        <Typography variant="caption" sx={{ mr: 0.5, color: 'primary.main', fontWeight: 800 }}>
                                            {sortOrder === 'asc' ? '↑' : '↓'}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: sortField === 'fileSize' ? 'primary.main' : 'text.secondary', fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase', transition: 'color 0.2s' }}>
                                        Size
                                    </Typography>
                                </Box>

                                {/* Date Header */}
                                <Box
                                    sx={{
                                        width: 100,
                                        flexShrink: 0,
                                        display: { xs: 'none', lg: 'flex' },
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        transition: 'opacity 0.2s',
                                        '&:hover': { opacity: 0.8 },
                                        '&:hover .MuiTypography-root': { color: 'text.primary' }
                                    }}
                                    onClick={() => onSortChange?.('createdAt')}
                                >
                                    {sortField === 'createdAt' && (
                                        <Typography variant="caption" sx={{ mr: 0.5, color: 'primary.main', fontWeight: 800 }}>
                                            {sortOrder === 'asc' ? '↑' : '↓'}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: sortField === 'createdAt' ? 'primary.main' : 'text.secondary', fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase', transition: 'color 0.2s' }}>
                                        Date
                                    </Typography>
                                </Box>

                                <Box sx={{ width: 140, flexShrink: 0 }} /> {/* Actions spacer */}
                            </Box>
                        )}

                        {/* List Items Container */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                gap: isMobile ? 1 : 0,
                                p: isMobile ? 2 : 0,
                                pt: isMobile ? 2 : undefined,
                                overflowY: 'auto',
                                flex: 1,
                                opacity: (isLoading && allData.length > 0) ? 0.6 : 1, // Dim when reloading existing data
                                pointerEvents: (isLoading && allData.length > 0) ? 'none' : 'auto',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {(isLoading && allData.length === 0) ? LoadingState : (allData.length === 0 ? EmptyState : (
                                <>
                                    {allData.map((item, index) => {
                                        if (item.type === 'folder') {
                                            const folder = item.data as Folder;
                                            return (
                                                <Box
                                                    key={`folder-${folder._id}`}
                                                    sx={{
                                                        borderBottom: !isMobile && index < allData.length - 1
                                                            ? `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                                            : 'none'
                                                    }}
                                                >
                                                    <FolderListItem
                                                        folder={folder}
                                                        dragOverId={dragOverId}
                                                        onNavigate={onNavigate}
                                                        onContextMenu={onContextMenu}
                                                        onDelete={onDeleteFolder}
                                                        onRename={onRenameFolder}
                                                        onChangeColor={onChangeFolderColor}
                                                        onDragOver={onDragOver}
                                                        onDrop={onDrop}
                                                        insideContainer
                                                    />
                                                </Box>
                                            );
                                        } else {
                                            const file = item.data as FileMetadata;
                                            return (
                                                <Box
                                                    key={`file-${file._id}`}
                                                    sx={{
                                                        borderBottom: !isMobile && index < allData.length - 1
                                                            ? `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                                            : 'none'
                                                    }}
                                                >
                                                    <FileListItem
                                                        file={file}
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
                                                        insideContainer
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
                                </>
                            ))}
                        </Box>
                    </Paper>
                ) : (
                    <Box
                        key="grid-view"
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
                            width: '100%',
                            overflowY: 'auto',
                            flex: 1,
                            alignContent: 'start', // Ensure items start from top
                            opacity: (isLoading && allData.length > 0) ? 0.6 : 1, // Dim when reloading existing data
                            pointerEvents: (isLoading && allData.length > 0) ? 'none' : 'auto',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {(isLoading && allData.length === 0) ? (
                            <Box sx={{ gridColumn: '1 / -1', display: 'flex', height: '100%', width: '100%' }}>{LoadingState}</Box>
                        ) : (allData.length === 0 ? (
                            <Box sx={{ gridColumn: '1 / -1', display: 'flex', height: '100%', width: '100%' }}>{EmptyState}</Box>
                        ) : (
                            <>
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
                            </>
                        ))}
                    </Box>
                )}
            </AnimatePresence>
        </Box>
    );
}


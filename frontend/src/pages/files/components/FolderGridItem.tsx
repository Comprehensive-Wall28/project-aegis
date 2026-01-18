import { memo } from 'react';
import { Box, Paper, Typography, Stack, IconButton, useTheme, alpha } from '@mui/material';
import {
    Folder as FolderIcon,
    Share as ShareIcon,
    Delete as TrashIcon,
    FolderShared as SharedIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import type { Folder } from '@/services/folderService';
import type { IconScalingConfig, TypoScalingConfig, ContextMenuTarget } from '../types';

interface FolderGridItemProps {
    folder: Folder;

    iconScaling: IconScalingConfig;
    typoScaling: TypoScalingConfig;
    dragOverId: string | null;
    onNavigate: (folder: Folder) => void;
    onContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void;
    onShare: (folder: Folder) => void;
    onDelete: (id: string) => void;
    onDragOver: (id: string | null) => void;
    onDrop: (targetId: string, droppedFileId: string) => void;
}

export const FolderGridItem = memo(({
    folder,

    iconScaling,
    typoScaling,
    dragOverId,
    onNavigate,
    onContextMenu,
    onShare,
    onDelete,
    onDragOver,
    onDrop
}: FolderGridItemProps) => {
    const theme = useTheme();

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            <Paper
                    elevation={0}
                    onClick={() => onNavigate(folder)}
                    onContextMenu={(e) => onContextMenu(e, { type: 'folder', id: folder._id })}
                    onDragOver={(e) => {
                        e.preventDefault();
                        onDragOver(folder._id);
                    }}
                    onDragLeave={() => onDragOver(null)}
                    onDrop={(e) => {
                        e.preventDefault();
                        const droppedFileId = e.dataTransfer.getData('fileId');
                        if (droppedFileId) {
                            onDrop(folder._id, droppedFileId);
                        }
                    }}
                    sx={{
                        p: iconScaling.padding,
                        position: 'relative',
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        borderRadius: '24px',
                        border: dragOverId === folder._id
                            ? `2px solid ${theme.palette.primary.main}`
                            : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: dragOverId === folder._id
                            ? alpha(theme.palette.primary.main, 0.1)
                            : alpha(theme.palette.background.paper, 0.4),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s, border-color 0.2s',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.paper, 0.6),
                            borderColor: alpha(theme.palette.divider, 0.3)
                        }
                    }}
                >
                    <Box sx={{ mb: typoScaling.mb, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))', position: 'relative' }}>
                        <FolderIcon sx={{ fontSize: iconScaling.size, color: folder.color || '#FFB300' }} />
                        {folder.isSharedWithMe && (
                            <SharedIcon
                                sx={{
                                    position: 'absolute',
                                    bottom: -iconScaling.size * 0.1,
                                    right: -iconScaling.size * 0.1,
                                    fontSize: iconScaling.size * 0.5,
                                    color: 'primary.main',
                                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                                    borderRadius: '50%',
                                    p: 0.2
                                }}
                            />
                        )}
                    </Box>

                    <Typography
                        variant={typoScaling.name}
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            width: '100%',
                            textAlign: 'center',
                            px: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as any,
                            overflow: 'hidden',
                            lineHeight: 1.3,
                            wordBreak: 'break-word',
                            fontSize: { xs: '0.875rem', sm: 'inherit' },
                            minHeight: { xs: '2.6em', sm: 'auto' }
                        }}
                    >
                        {folder.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, mb: 1 }}>
                        Folder
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        onClick={e => e.stopPropagation()}
                    >
                        <IconButton
                            size="small"
                            onClick={() => onShare(folder)}
                            sx={{
                                color: 'primary.main',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                            }}
                        >
                            <ShareIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDelete(folder._id)}
                            sx={{
                                color: '#EF5350',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha('#EF5350', 0.1) }
                            }}
                        >
                            <TrashIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={(e) => onContextMenu(e, { type: 'folder', id: folder._id })}
                            sx={{
                                color: 'text.secondary',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) }
                            }}
                        >
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Paper>
        </Box>
    );
});

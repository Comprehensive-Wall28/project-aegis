import { memo } from 'react';
import { Box, Paper, Typography, Stack, IconButton, useTheme, alpha, Grid } from '@mui/material';
import {
    Folder as FolderIcon,
    Share as ShareIcon,
    Delete as TrashIcon,
    FolderShared as SharedIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import type { Folder } from '@/services/folderService';
import type { GridSizeConfig, IconScalingConfig, TypoScalingConfig } from '../types';

interface FolderGridItemProps {
    folder: Folder;
    gridSize: GridSizeConfig;
    iconScaling: IconScalingConfig;
    typoScaling: TypoScalingConfig;
    dragOverId: string | null;
    onNavigate: (folder: Folder) => void;
    onContextMenu: (e: React.MouseEvent, target: any) => void;
    onShare: (folder: Folder) => void;
    onDelete: (id: string) => void;
    onDragOver: (id: string | null) => void;
    onDrop: (targetId: string, droppedFileId: string) => void;
}

export const FolderGridItem = memo(({
    folder,
    gridSize,
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
        <Grid size={gridSize}>
            <Box style={{ height: '100%' }}>
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
                        p: 2,
                        position: 'relative',
                        cursor: 'pointer',
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
                        aspectRatio: '1/1',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, box-shadow 0.2s',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.paper, 0.6),
                            borderColor: alpha(theme.palette.divider, 0.3),
                            transform: 'translateY(-4px)',
                            boxShadow: `0 12px 24px -8px ${alpha(theme.palette.common.black, 0.5)}`
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
                        variant={typoScaling.name as any}
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            width: '100%',
                            textAlign: 'center',
                            px: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.2,
                            wordBreak: 'break-word'
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
        </Grid>
    );
});

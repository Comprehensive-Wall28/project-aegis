import { memo } from 'react';
import { Box, Paper, Typography, Stack, IconButton, useTheme, alpha, Checkbox, Grid } from '@mui/material';
import {
    Delete as TrashIcon,
    Download as DownloadIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import type { FileMetadata } from '@/services/vaultService';
import type { GridSizeConfig, IconScalingConfig, TypoScalingConfig } from '../types';
import { getFileIconInfo, formatFileSize } from '../utils';

interface FileGridItemProps {
    file: FileMetadata;
    gridSize: GridSizeConfig;
    iconScaling: IconScalingConfig;
    typoScaling: TypoScalingConfig;
    isSelected: boolean;
    isDownloading: boolean;
    isDeleting: boolean;
    onFileClick: (file: FileMetadata, e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent, target: any) => void;
    onDownload: (file: FileMetadata) => void;
    onDelete: (id: string) => void;
    onDragStart: (id: string) => void;
}

export const FileGridItem = memo(({
    file,
    gridSize,
    iconScaling,
    typoScaling,
    isSelected,
    isDownloading,
    isDeleting,
    onFileClick,
    onContextMenu,
    onDownload,
    onDelete,
    onDragStart
}: FileGridItemProps) => {
    const theme = useTheme();
    const { icon: FileTypeIcon, color } = getFileIconInfo(file.originalFileName);

    return (
        <Grid size={gridSize}>
            <Box style={{ height: '100%' }}>
                <Paper
                    elevation={0}
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData('fileId', file._id);
                        onDragStart(file._id);
                    }}
                    onClick={(e) => onFileClick(file, e)}
                    onContextMenu={(e) => onContextMenu(e, { type: 'file', id: file._id })}
                    sx={{
                        p: 2,
                        position: 'relative',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        borderRadius: '24px',
                        border: isSelected
                            ? `2px solid ${theme.palette.primary.main}`
                            : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: isSelected
                            ? alpha(theme.palette.primary.main, 0.1)
                            : alpha(theme.palette.background.paper, 0.4),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '1/1',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, box-shadow 0.2s',
                        '&:hover': {
                            bgcolor: isSelected
                                ? alpha(theme.palette.primary.main, 0.15)
                                : alpha(theme.palette.background.paper, 0.6),
                            borderColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3),
                            transform: 'translateY(-4px)',
                            boxShadow: `0 12px 24px -8px ${alpha(theme.palette.common.black, 0.5)}`
                        }
                    }}
                >
                    <Box sx={{ position: 'absolute', top: 12, left: 12, opacity: isSelected ? 1 : 0, transition: 'opacity 0.2s' }}>
                        <Checkbox
                            checked={isSelected}
                            size="small"
                            sx={{ p: 0, color: theme.palette.primary.main }}
                        />
                    </Box>

                    <Box sx={{ mb: typoScaling.mb, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
                        <FileTypeIcon sx={{ fontSize: iconScaling.size, color: color }} />
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
                        title={file.originalFileName}
                    >
                        {file.originalFileName}
                    </Typography>

                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, mb: 1 }}>
                        {formatFileSize(file.fileSize)}
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        onClick={e => e.stopPropagation()}
                    >
                        <IconButton
                            size="small"
                            onClick={() => onDownload(file)}
                            disabled={isDownloading}
                            sx={{
                                color: 'primary.main',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                            }}
                        >
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDelete(file._id)}
                            disabled={isDeleting}
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
                            onClick={(e) => onContextMenu(e, { type: 'file', id: file._id })}
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

import { memo } from 'react';
import { Box, Paper, Typography, Stack, IconButton, useTheme, alpha } from '@mui/material';
import type { Theme } from '@mui/material';
import {
    Delete as TrashIcon,
    Download as DownloadIcon,
    MoreVert as MoreVertIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    DriveFileMove as MoveIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import type { FileMetadata } from '@/services/vaultService';
import type { IconScalingConfig, TypoScalingConfig, ContextMenuTarget } from '../types';
import { getFileIconInfo, formatFileSize, isPreviewable, createDragPreview } from '../utils';

interface FileGridItemProps {
    file: FileMetadata;

    iconScaling: IconScalingConfig;
    typoScaling: TypoScalingConfig;
    isSelected: boolean;
    isDownloading: boolean;
    isDeleting: boolean;
    onFileClick: (file: FileMetadata, e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void;
    onDownload: (file: FileMetadata) => void;
    onDelete: (id: string) => void;
    onToggleSelect: (id: string) => void;
    onMove: (file: FileMetadata) => void;
    selectedCount: number;
    isHighlighted?: boolean;
}

export const FileGridItem = memo(({
    file,

    iconScaling,
    typoScaling,
    isSelected,
    isDownloading,
    isDeleting,
    onFileClick,
    onContextMenu,
    onDownload,
    onDelete,
    onToggleSelect,
    onMove,
    selectedCount,
    isHighlighted
}: FileGridItemProps) => {
    const theme = useTheme();
    const { icon: FileTypeIcon, color } = getFileIconInfo(file.originalFileName);

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            <Paper
                elevation={0}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('fileId', file._id);

                    // Create custom drag preview
                    const dragCount = isSelected ? selectedCount : 1;
                    if (dragCount > 0) {
                        // We need to pass the icon SVG or similar. For now, let's use a generic file icon color.
                        // Ideally, we'd render the actual icon to string, but that's complex. 
                        // The util uses a default white SVG.
                        const preview = createDragPreview(file.originalFileName, dragCount);
                        e.dataTransfer.setDragImage(preview, 0, 0);

                        // Remove after browser captures it
                        setTimeout(() => {
                            if (document.body.contains(preview)) {
                                document.body.removeChild(preview);
                            }
                        }, 0);
                    }
                }}
                onClick={(e) => onFileClick(file, e)}
                onContextMenu={(e) => onContextMenu(e, { type: 'file', id: file._id })}
                sx={getPaperStyles(theme, isSelected, iconScaling, isHighlighted)}
            >
                {isPreviewable(file.originalFileName) && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: 'text.secondary',
                            opacity: 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(theme.palette.background.paper, 0.85),
                            borderRadius: '50%',
                            p: 0.5,
                            pointerEvents: 'none'
                        }}
                    >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                    </Box>
                )}

                <Box sx={{ mb: typoScaling.mb, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
                    <FileTypeIcon sx={{ fontSize: iconScaling.size, color: color }} />
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
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                        fontSize: { xs: '0.875rem', sm: 'inherit' },
                        minHeight: { xs: '2.6em', sm: 'auto' }
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
                        onClick={() => onToggleSelect(file._id)}
                        aria-label={isSelected ? "Deselect item" : "Select item"}
                        sx={{
                            color: isSelected ? 'primary.main' : 'text.secondary',
                            p: 0.5,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                        }}
                    >
                        {isSelected ? <CheckCircleIcon fontSize="small" /> : <UncheckedIcon fontSize="small" />}
                    </IconButton>

                    <IconButton
                        size="small"
                        onClick={() => onDownload(file)}
                        disabled={isDownloading}
                        aria-label="Download file"
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
                        aria-label="Delete file"
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
                        onClick={() => onMove(file)}
                        aria-label="Move file"
                        sx={{
                            color: 'warning.main',
                            p: 0.5,
                            '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) }
                        }}
                    >
                        <MoveIcon fontSize="small" />
                    </IconButton>

                    <IconButton
                        size="small"
                        onClick={(e) => onContextMenu(e, { type: 'file', id: file._id })}
                        aria-label="More options"
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

const getPaperStyles = (theme: Theme, isSelected: boolean, iconScaling: IconScalingConfig, isHighlighted?: boolean) => ({
    p: iconScaling.padding,
    position: 'relative',
    cursor: 'grab',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    '&:active': { cursor: 'grabbing' },
    borderRadius: '24px',
    border: isSelected
        ? `2px solid ${theme.palette.primary.main}`
        : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    bgcolor: isSelected
        ? alpha(theme.palette.primary.main, 0.25)
        : alpha(theme.palette.background.paper, 0.85),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s',
    '&:hover': {
        bgcolor: isSelected
            ? alpha(theme.palette.primary.main, 0.3)
            : alpha(theme.palette.background.paper, 1.0),
        borderColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.4),
    },
    ...(isHighlighted && {
        animation: 'highlight-pulse 2s infinite ease-in-out',
        boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.4)}`,
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
        zIndex: 10,
        transform: 'scale(1.02)',
        '@keyframes highlight-pulse': {
            '0%': { boxShadow: `0 0 0 0px ${alpha(theme.palette.primary.main, 0.7)}` },
            '70%': { boxShadow: `0 0 0 15px ${alpha(theme.palette.primary.main, 0)}` },
            '100%': { boxShadow: `0 0 0 0px ${alpha(theme.palette.primary.main, 0)}` },
        },
    })
});

import { memo } from 'react';
import { Box, Paper, Typography, Stack, IconButton, useTheme, alpha, Grid } from '@mui/material';
import {
    Delete as TrashIcon,
    Download as DownloadIcon,
    MoreVert as MoreVertIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    DriveFileMove as MoveIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import { motion, type Variants } from 'framer-motion';
import type { FileMetadata } from '@/services/vaultService';
import type { GridSizeConfig, IconScalingConfig, TypoScalingConfig, ContextMenuTarget } from '../types';
import { getFileIconInfo, formatFileSize, isPreviewable } from '../utils';

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30
        }
    }
};

interface FileGridItemProps {
    file: FileMetadata;
    gridSize: GridSizeConfig;
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
    isMobile: boolean;
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
    onToggleSelect,
    onMove,
    isMobile
}: FileGridItemProps) => {
    const theme = useTheme();
    const { icon: FileTypeIcon, color } = getFileIconInfo(file.originalFileName);

    return (
        <Grid
            size={gridSize}
            component={motion.div}
            variants={itemVariants}
            initial={isMobile ? false : 'hidden'}
            whileInView={isMobile ? undefined : 'visible'}
            viewport={{ once: true }}
        >
            <Box
                sx={{ height: '100%', willChange: 'transform, opacity' }}
            >
                <Paper
                    elevation={0}
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData('fileId', file._id);
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
                        transition: 'background-color 0.2s, border-color 0.2s',
                        '&:hover': {
                            bgcolor: isSelected
                                ? alpha(theme.palette.primary.main, 0.15)
                                : alpha(theme.palette.background.paper, 0.6),
                            borderColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3),
                        }
                    }}
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
                                bgcolor: alpha(theme.palette.background.paper, 0.5),
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
                            onClick={() => onToggleSelect(file._id)}
                            sx={{
                                color: isSelected ? 'primary.main' : 'text.secondary',
                                p: 0.5,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                            }}
                        >
                            {isSelected ? <CheckCircleIcon fontSize="small" /> : <UncheckedIcon fontSize="small" />}
                        </IconButton>

                        {!isMobile && (
                            <>
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
                                    onClick={() => onMove(file)}
                                    sx={{
                                        color: 'warning.main',
                                        p: 0.5,
                                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) }
                                    }}
                                >
                                    <MoveIcon fontSize="small" />
                                </IconButton>
                            </>
                        )}

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

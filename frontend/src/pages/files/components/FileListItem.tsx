import { memo, useState } from 'react';
import { Box, Paper, Typography, Stack, IconButton, Checkbox, useTheme, alpha, useMediaQuery, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import type { Theme } from '@mui/material';
import {
    Delete as TrashIcon,
    Download as DownloadIcon,
    MoreVert as MoreVertIcon,
    DriveFileMove as MoveIcon
} from '@mui/icons-material';
import type { FileMetadata } from '@/services/vaultService';
import type { ContextMenuTarget } from '../types';
import { getFileIconInfo, formatFileSize, createDragPreview } from '../utils';

interface FileListItemProps {
    file: FileMetadata;
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
    insideContainer?: boolean;
}

export const FileListItem = memo(({
    file,
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
    isHighlighted,
    insideContainer = false
}: FileListItemProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
    const { icon: FileTypeIcon, color } = getFileIconInfo(file.originalFileName);

    const handleMobileMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setMobileMenuAnchor(e.currentTarget);
    };

    const handleMobileMenuClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setMobileMenuAnchor(null);
    };

    const handleMenuAction = (action: () => void) => {
        handleMobileMenuClose();
        action();
    };

    return (
        <Paper
            elevation={insideContainer ? 0 : (isMobile ? 2 : 0)}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('fileId', file._id);
                const dragCount = isSelected ? selectedCount : 1;
                if (dragCount > 0) {
                    const preview = createDragPreview(file.originalFileName, dragCount);
                    e.dataTransfer.setDragImage(preview, 0, 0);
                    setTimeout(() => {
                        if (document.body.contains(preview)) {
                            document.body.removeChild(preview);
                        }
                    }, 0);
                }
            }}
            onClick={(e) => onFileClick(file, e)}
            onContextMenu={(e) => onContextMenu(e, { type: 'file', id: file._id })}
            sx={getPaperStyles(theme, isSelected, isHighlighted, isMobile, insideContainer)}
        >
            <Stack
                direction="row"
                alignItems="center"
                spacing={isMobile ? 1.5 : 2}
                sx={{ width: '100%', py: isMobile ? 1.5 : 1, px: isMobile ? 1.5 : 2 }}
            >
                {/* Checkbox - leftmost */}
                <Box sx={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Checkbox
                        checked={isSelected}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(file._id);
                        }}
                        size="small"
                        sx={{
                            color: 'text.secondary',
                            '&.Mui-checked': { color: 'primary.main' },
                            p: 0.5
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? 32 : 40, flexShrink: 0 }}>
                    <FileTypeIcon sx={{ fontSize: isMobile ? 24 : 28, color: color }} />
                </Box>

                {/* Name - takes most space */}
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                    title={file.originalFileName}
                >
                    {file.originalFileName}
                </Typography>

                {/* Type - hidden on mobile */}
                {!isMobile && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            width: 80,
                            flexShrink: 0,
                            textAlign: 'left',
                            display: { xs: 'none', sm: 'block' }
                        }}
                    >
                        {file.originalFileName.split('.').pop()?.toUpperCase() || 'File'}
                    </Typography>
                )}

                {/* Size - hidden on mobile */}
                {!isMobile && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            width: 80,
                            flexShrink: 0,
                            textAlign: 'right',
                            display: { xs: 'none', md: 'block' }
                        }}
                    >
                        {formatFileSize(file.fileSize)}
                    </Typography>
                )}

                {/* Date - hidden on mobile */}
                {!isMobile && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            width: 100,
                            flexShrink: 0,
                            textAlign: 'right',
                            display: { xs: 'none', lg: 'block' }
                        }}
                    >
                        {new Date(file.createdAt).toLocaleDateString()}
                    </Typography>
                )}

                {/* Actions - mobile: single menu button, desktop: individual buttons */}
                <Stack
                    direction="row"
                    alignItems="center"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                        flexShrink: 0,
                        minWidth: { xs: 'auto', md: 140 },
                        justifyContent: 'flex-end',
                        gap: 0.5
                    }}
                >
                    {isMobile ? (
                        <>
                            <IconButton
                                size="small"
                                onClick={handleMobileMenuOpen}
                                aria-label="More options"
                                sx={{
                                    color: 'text.secondary',
                                    p: 0.5,
                                    '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) }
                                }}
                            >
                                <MoreVertIcon fontSize="small" />
                            </IconButton>
                            <Menu
                                anchorEl={mobileMenuAnchor}
                                open={Boolean(mobileMenuAnchor)}
                                onClose={() => handleMobileMenuClose()}
                                onClick={(e) => e.stopPropagation()}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                PaperProps={{
                                    sx: {
                                        borderRadius: '12px',
                                        minWidth: 180
                                    }
                                }}
                            >
                                <MenuItem
                                    onClick={() => handleMenuAction(() => onDownload(file))}
                                    disabled={isDownloading}
                                >
                                    <ListItemIcon>
                                        <DownloadIcon fontSize="small" color="primary" />
                                    </ListItemIcon>
                                    <ListItemText>Download</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => handleMenuAction(() => onMove(file))}>
                                    <ListItemIcon>
                                        <MoveIcon fontSize="small" color="warning" />
                                    </ListItemIcon>
                                    <ListItemText>Move</ListItemText>
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleMenuAction(() => onDelete(file._id))}
                                    disabled={isDeleting}
                                >
                                    <ListItemIcon>
                                        <TrashIcon fontSize="small" color="error" />
                                    </ListItemIcon>
                                    <ListItemText>Delete</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={(e) => { handleMobileMenuClose(e); onContextMenu(e as unknown as React.MouseEvent, { type: 'file', id: file._id }); }}>
                                    <ListItemIcon>
                                        <MoreVertIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>More</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
});

const getPaperStyles = (theme: Theme, isSelected: boolean, isHighlighted?: boolean, isMobile?: boolean, insideContainer?: boolean) => ({
    cursor: 'grab',
    width: '100%',
    overflow: 'hidden',
    borderRadius: insideContainer ? 0 : (isMobile ? '16px' : '12px'),
    border: isSelected
        ? `2px solid ${theme.palette.primary.main}`
        : insideContainer
            ? '2px solid transparent'
            : isMobile
                ? `1px solid ${alpha(theme.palette.divider, 0.1)}`
                : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    bgcolor: isSelected
        ? alpha(theme.palette.primary.main, 0.15)
        : 'transparent',
    transition: 'background-color 0.2s, border-color 0.2s',
    '&:active': { cursor: 'grabbing' },
    '&:hover': {
        bgcolor: isSelected
            ? alpha(theme.palette.primary.main, 0.2)
            : insideContainer
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha(theme.palette.background.paper, 1.0),
        borderColor: isSelected ? theme.palette.primary.main : undefined,
    },
    ...(isHighlighted && {
        animation: 'highlight-pulse 2s infinite ease-in-out',
        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.4)}`,
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
        zIndex: 10,
        '@keyframes highlight-pulse': {
            '0%': { boxShadow: `0 0 0 0px ${alpha(theme.palette.primary.main, 0.7)}` },
            '70%': { boxShadow: `0 0 0 10px ${alpha(theme.palette.primary.main, 0)}` },
            '100%': { boxShadow: `0 0 0 0px ${alpha(theme.palette.primary.main, 0)}` },
        },
    })
});

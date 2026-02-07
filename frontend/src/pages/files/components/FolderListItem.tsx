import { memo, useState } from 'react';
import { Box, Paper, Typography, Stack, IconButton, Checkbox, useTheme, alpha, useMediaQuery, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import type { Theme } from '@mui/material';
import {
    Folder as FolderIcon,
    Delete as TrashIcon,
    MoreVert as MoreVertIcon
} from '@mui/icons-material';
import type { Folder } from '@/services/folderService';
import type { ContextMenuTarget } from '../types';

interface FolderListItemProps {
    folder: Folder;
    dragOverId: string | null;
    onNavigate: (folder: Folder) => void;
    onContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void;
    onDelete: (id: string) => void;
    onDragOver: (id: string | null) => void;
    onDrop: (targetId: string, droppedFileId: string) => void;
    insideContainer?: boolean;
}

export const FolderListItem = memo(({
    folder,
    dragOverId,
    onNavigate,
    onContextMenu,
    onDelete,
    onDragOver,
    onDrop,
    insideContainer = false
}: FolderListItemProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
    const isDragOver = dragOverId === folder._id;

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
            sx={getPaperStyles(theme, isDragOver, isMobile, insideContainer)}
        >
            <Stack
                direction="row"
                alignItems="center"
                spacing={isMobile ? 1.5 : 2}
                sx={{ width: '100%', py: isMobile ? 1.5 : 1, px: isMobile ? 1.5 : 2 }}
            >
                {/* Spacer to align with file checkboxes */}
                <Box sx={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Checkbox
                        size="small"
                        disabled
                        sx={{
                            p: 0.5,
                            visibility: 'hidden',
                            pointerEvents: 'none'
                        }}
                    />
                </Box>

                {/* Icon */}
                <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{ width: isMobile ? 32 : 40, flexShrink: 0 }}
                >
                    <FolderIcon sx={{ fontSize: isMobile ? 24 : 28, color: folder.color || '#FFB300' }} />
                </Stack>

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
                    title={folder.name}
                >
                    {folder.name}
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
                        Folder
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
                        —
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
                        {folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : '—'}
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
                                <MenuItem onClick={() => handleMenuAction(() => onDelete(folder._id))}>
                                    <ListItemIcon>
                                        <TrashIcon fontSize="small" color="error" />
                                    </ListItemIcon>
                                    <ListItemText>Delete</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={(e) => { handleMobileMenuClose(e); onContextMenu(e as unknown as React.MouseEvent, { type: 'folder', id: folder._id }); }}>
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
                                onClick={() => onDelete(folder._id)}
                                aria-label="Delete folder"
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

const getPaperStyles = (theme: Theme, isDragOver: boolean, isMobile?: boolean, insideContainer?: boolean) => ({
    cursor: 'pointer',
    width: '100%',
    overflow: 'hidden',
    borderRadius: insideContainer ? 0 : (isMobile ? '16px' : '12px'),
    border: isDragOver
        ? `2px solid ${theme.palette.primary.main}`
        : insideContainer
            ? '2px solid transparent'
            : isMobile
                ? `1px solid ${alpha(theme.palette.divider, 0.1)}`
                : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    bgcolor: isDragOver
        ? alpha(theme.palette.primary.main, 0.2)
        : 'transparent',
    transition: 'background-color 0.2s, border-color 0.2s',
    '&:hover': {
        bgcolor: insideContainer
            ? alpha(theme.palette.primary.main, 0.08)
            : alpha(theme.palette.background.paper, 1.0),
        borderColor: isDragOver ? theme.palette.primary.main : undefined,
    }
});

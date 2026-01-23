import React from 'react';
import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemText,
    IconButton,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Folder,
    FolderOpen,
    CreateNewFolder,
    Edit as EditIcon,
    Delete,
} from '@mui/icons-material';
import { Virtuoso } from 'react-virtuoso';
import { motion } from 'framer-motion';
import type { NoteFolder } from '../../services/noteService';
import { useFolderDragDrop } from '../../hooks/useFolderDragDrop';

interface FolderPanelProps {
    folders: NoteFolder[];
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
    onOpenFolderDialog: (mode: 'create' | 'rename', folder?: NoteFolder) => void;
    onDeleteFolder: (id: string) => void;
    dragDrop: ReturnType<typeof useFolderDragDrop>;
}

export const FolderPanel: React.FC<FolderPanelProps> = ({
    folders,
    selectedFolderId,
    onSelectFolder,
    onOpenFolderDialog,
    onDeleteFolder,
    dragDrop
}) => {
    const theme = useTheme();
    const { dragOverFolderId, handleFolderDragOver, handleFolderDragLeave, handleNoteDrop } = dragDrop;

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            bgcolor: 'background.paper',
            borderRadius: '16px',
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <Box sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: 1,
                borderColor: alpha(theme.palette.divider, 0.1),
                flexShrink: 0
            }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Folders
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => onOpenFolderDialog('create')}
                    sx={{
                        color: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                    }}
                >
                    <CreateNewFolder fontSize="small" />
                </IconButton>
            </Box>

            {/* All Notes */}
            <List disablePadding sx={{ flexShrink: 0 }}>
                <ListItemButton
                    selected={selectedFolderId === null}
                    onClick={() => onSelectFolder(null)}
                    onDragOver={(e) => handleFolderDragOver(e, null)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleNoteDrop(e, null)}
                    sx={{
                        mx: 1,
                        mt: 1,
                        borderRadius: '10px',
                        py: 1,
                        transition: 'all 0.2s',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        bgcolor: dragOverFolderId === 'root'
                            ? alpha(theme.palette.primary.main, 0.2)
                            : 'transparent',
                        transform: dragOverFolderId === 'root' ? 'scale(1.02)' : 'scale(1)',
                        '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) }
                        },
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
                    }}
                >
                    <FolderOpen sx={{
                        fontSize: 22,
                        mr: 1.5,
                        color: selectedFolderId === null ? 'primary.main' : 'text.secondary'
                    }} />
                    <ListItemText
                        primary="All Notes"
                        primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: selectedFolderId === null ? 600 : 400
                        }}
                    />
                </ListItemButton>
            </List>

            {/* Folders List */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                mt: 0.5,
                scrollbarGutter: 'stable'
            }}>
                <Virtuoso
                    style={{ height: '100%' }}
                    data={folders}
                    itemContent={(index, folder) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                                opacity: 1,
                                x: 0,
                                transitionEnd: { transform: 'none' }
                            }}
                            transition={{
                                duration: 0.25,
                                delay: Math.min(index * 0.03, 0.3),
                                ease: "easeOut"
                            }}
                        >
                            <ListItemButton
                                selected={selectedFolderId === folder._id}
                                onClick={() => onSelectFolder(folder._id)}
                                onDragOver={(e) => handleFolderDragOver(e, folder._id)}
                                onDragLeave={handleFolderDragLeave}
                                onDrop={(e) => handleNoteDrop(e, folder._id)}
                                sx={{
                                    mx: 1,
                                    borderRadius: '10px',
                                    py: 0.75,
                                    mb: 0.5,
                                    transition: 'all 0.2s',
                                    WebkitFontSmoothing: 'antialiased',
                                    MozOsxFontSmoothing: 'grayscale',
                                    bgcolor: dragOverFolderId === folder._id
                                        ? alpha(theme.palette.primary.main, 0.2)
                                        : 'transparent',
                                    transform: dragOverFolderId === folder._id ? 'scale(1.02)' : 'scale(1)',
                                    '&.Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) }
                                    },
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
                                }}
                            >
                                <Folder sx={{
                                    fontSize: 20,
                                    mr: 1.5,
                                    color: folder.color || (selectedFolderId === folder._id ? 'primary.main' : 'text.secondary')
                                }} />
                                <ListItemText
                                    primary={folder.name}
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                        fontWeight: selectedFolderId === folder._id ? 600 : 400,
                                        noWrap: true
                                    }}
                                />
                                <Box sx={{
                                    display: 'flex',
                                    opacity: 0,
                                    gap: 0.5,
                                    '.MuiListItemButton-root:hover &': { opacity: 0.7 },
                                    '&:hover': { opacity: '1 !important' }
                                }}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenFolderDialog('rename', folder);
                                        }}
                                        sx={{ p: 0.5 }}
                                    >
                                        <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteFolder(folder._id);
                                        }}
                                        sx={{ p: 0.5, '&:hover': { color: 'error.main' } }}
                                    >
                                        <Delete sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Box>
                            </ListItemButton>
                        </motion.div>
                    )}
                />
            </Box>
        </Box>
    );
};

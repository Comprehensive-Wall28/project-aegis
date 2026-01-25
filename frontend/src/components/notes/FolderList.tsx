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
    Collapse,
} from '@mui/material';
import {
    Folder,
    FolderOpen,
    CreateNewFolder,
    Edit as EditIcon,
    Delete,
    ExpandMore,
    ChevronRight,
} from '@mui/icons-material';
import { Virtuoso } from 'react-virtuoso';
import type { NoteFolder } from '../../services/noteService';
import { useFolderDragDrop } from '../../hooks/useFolderDragDrop';

interface FolderListProps {
    folders: NoteFolder[];
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
    foldersExpanded: boolean;
    setFoldersExpanded: (expanded: boolean) => void;
    onOpenFolderDialog: (mode: 'create' | 'rename', folder?: NoteFolder) => void;
    onDeleteFolder: (id: string) => void;
    dragDrop: ReturnType<typeof useFolderDragDrop>;
}

export const FolderList: React.FC<FolderListProps> = ({
    folders,
    selectedFolderId,
    onSelectFolder,
    foldersExpanded,
    setFoldersExpanded,
    onOpenFolderDialog,
    onDeleteFolder,
    dragDrop
}) => {
    const theme = useTheme();
    const { dragOverFolderId, droppedFolderId, handleFolderDragEnter, handleFolderDragOver, handleFolderDragLeave, handleNoteDrop } = dragDrop;

    return (
        <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <Box sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        gap: 0.5,
                        flex: 1,
                        '&:hover': { color: 'primary.main' }
                    }}
                    onClick={() => setFoldersExpanded(!foldersExpanded)}
                >
                    {foldersExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                    <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
                        Folders
                    </Typography>
                </Box>
                <IconButton
                    size="small"
                    onClick={() => onOpenFolderDialog('create')}
                    sx={{ color: 'primary.main' }}
                >
                    <CreateNewFolder fontSize="small" />
                </IconButton>
            </Box>

            <Collapse in={foldersExpanded} timeout="auto" unmountOnExit>
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column' }}>
                    <ListItemButton
                        selected={selectedFolderId === null}
                        onClick={() => onSelectFolder(null)}
                        onDragEnter={(e) => handleFolderDragEnter(e, null)}
                        onDragOver={(e) => handleFolderDragOver(e, null)}
                        onDragLeave={handleFolderDragLeave}
                        onDrop={(e) => handleNoteDrop(e, null)}
                        sx={{
                            mx: 1,
                            borderRadius: '10px',
                            py: 0.5,
                            mb: 0.5,
                            transition: 'all 0.2s',
                            flexShrink: 0,
                            bgcolor: droppedFolderId === 'root'
                                ? alpha(theme.palette.success.main, 0.15)
                                : dragOverFolderId === 'root'
                                    ? alpha(theme.palette.primary.main, 0.2)
                                    : 'transparent',
                            transform: (dragOverFolderId === 'root' || droppedFolderId === 'root') ? 'scale(1.02)' : 'scale(1)',
                            '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                        }}
                    >
                        <FolderOpen sx={{ fontSize: 20, mr: 1.5, color: selectedFolderId === null ? 'primary.main' : 'text.secondary' }} />
                        <ListItemText primary="All Notes" slotProps={{ primary: { variant: 'body2', fontWeight: selectedFolderId === null ? 600 : 400 } }} />
                    </ListItemButton>

                    <Box sx={{ height: '35vh', maxHeight: '300px' }}>
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={folders}
                            itemContent={(_index, folder) => (
                                <ListItemButton
                                    key={folder._id}
                                    selected={selectedFolderId === folder._id}
                                    onClick={() => onSelectFolder(folder._id)}
                                    onDragEnter={(e) => handleFolderDragEnter(e, folder._id)}
                                    onDragOver={(e) => handleFolderDragOver(e, folder._id)}
                                    onDragLeave={handleFolderDragLeave}
                                    onDrop={(e) => handleNoteDrop(e, folder._id)}
                                    sx={{
                                        mx: 1,
                                        borderRadius: '10px',
                                        py: 0.5,
                                        mb: 0.5,
                                        transition: 'all 0.2s',
                                        bgcolor: droppedFolderId === folder._id
                                            ? alpha(theme.palette.success.main, 0.15)
                                            : dragOverFolderId === folder._id
                                                ? alpha(theme.palette.primary.main, 0.2)
                                                : 'transparent',
                                        transform: (dragOverFolderId === folder._id || droppedFolderId === folder._id) ? 'scale(1.02)' : 'scale(1)',
                                        '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                                    }}
                                >
                                    <Folder sx={{ fontSize: 20, mr: 1.5, color: folder.color || (selectedFolderId === folder._id ? 'primary.main' : 'text.secondary') }} />
                                    <ListItemText
                                        primary={folder.name}
                                        slotProps={{
                                            primary: {
                                                variant: 'body2',
                                                fontWeight: selectedFolderId === folder._id ? 600 : 400,
                                                noWrap: true
                                            }
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', opacity: 0, '.MuiListItemButton-root:hover &': { opacity: 0.5 } }}>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenFolderDialog('rename', folder);
                                            }}
                                        >
                                            <EditIcon fontSize="inherit" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteFolder(folder._id);
                                            }}
                                        >
                                            <Delete fontSize="inherit" />
                                        </IconButton>
                                    </Box>
                                </ListItemButton>
                            )}
                        />
                    </Box>
                </List>
            </Collapse>
        </Box>
    );
};

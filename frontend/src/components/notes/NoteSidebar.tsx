import React from 'react';
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    TextField,
    InputAdornment,
    Chip,
    alpha,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Add,
    Search,
    NoteAlt,
    Tag,
    Close as CloseIcon,
} from '@mui/icons-material';
import type { NoteMetadata, NoteFolder } from '../../services/noteService';
import { useFolderDragDrop } from '../../hooks/useFolderDragDrop';
import { FolderList } from './FolderList';
import { NoteList } from './NoteList';

interface NoteSidebarProps {
    notes: NoteMetadata[]; // filtered notes
    folders: NoteFolder[];
    selectedFolderId: string | null;
    selectedNoteId: string | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onCreateNote: () => void;
    onSelectFolder: (id: string | null) => void;
    onSelectNote: (note: NoteMetadata) => void;
    onDeleteNote: (id: string, e: React.MouseEvent) => void;
    userTags: string[];
    selectedTags: string[];
    onToggleTag: (tag: string) => void;
    foldersExpanded: boolean;
    setFoldersExpanded: (expanded: boolean) => void;
    onOpenFolderDialog: (mode: 'create' | 'rename', folder?: NoteFolder) => void;
    onDeleteFolder: (id: string) => void;
    isRefreshing: boolean;
    isLoading: boolean;
    decryptedTitles: Map<string, string>;
    dragDrop: ReturnType<typeof useFolderDragDrop>;
}

export const NoteSidebar: React.FC<NoteSidebarProps> = (props) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const {
        notes,
        folders,
        selectedFolderId,
        selectedNoteId,
        searchQuery,
        onSearchChange,
        onCreateNote,
        onSelectFolder,
        onSelectNote,
        onDeleteNote,
        userTags,
        selectedTags,
        onToggleTag,
        foldersExpanded,
        setFoldersExpanded,
        onOpenFolderDialog,
        onDeleteFolder,
        isRefreshing,
        isLoading,
        decryptedTitles,
        dragDrop
    } = props;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <NoteAlt sx={{ color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
                    {selectedFolderId
                        ? (folders.find(f => f._id === selectedFolderId)?.name || 'Notes')
                        : 'Notes'
                    }
                </Typography>
                <Tooltip title="New Note">
                    <IconButton
                        color="primary"
                        onClick={onCreateNote}
                        size="small"
                        sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                    >
                        <Add />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Folder Selection (Mobile) / Tag Filters */}
            <Box sx={{ px: 2, pb: 1.5 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                            '& fieldset': {
                                borderColor: alpha(theme.palette.divider, 0.2),
                            },
                            '&:hover fieldset': {
                                borderColor: alpha(theme.palette.primary.main, 0.4),
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: theme.palette.primary.main,
                            },
                        },
                    }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => onSearchChange('')}
                                        edge="end"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        },
                    }}
                />
            </Box>

            {/* Folders Section */}
            <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={(id) => {
                    onSelectFolder(id);
                    setFoldersExpanded(false);
                }}
                foldersExpanded={foldersExpanded}
                setFoldersExpanded={setFoldersExpanded}
                onOpenFolderDialog={onOpenFolderDialog}
                onDeleteFolder={onDeleteFolder}
                dragDrop={dragDrop}
            />

            {/* Collapsible Content (Tags + Notes) */}
            <Box
                sx={{
                    flex: 1,
                    overflow: 'hidden',
                    display: (isMobile && foldersExpanded) ? 'none' : 'flex',
                    flexDirection: 'column'
                }}
            >
                <Box sx={{ borderTop: 1, borderColor: alpha(theme.palette.divider, 0.1), mt: 1 }} />

                {/* Tag Filters */}
                {userTags.length > 0 && (
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {userTags.slice(0, 8).map(tag => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                icon={<Tag fontSize="small" />}
                                onClick={() => onToggleTag(tag)}
                                color={selectedTags.includes(tag) ? 'primary' : 'default'}
                                variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                                sx={{
                                    borderRadius: '8px',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                    },
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Notes List */}
                <NoteList
                    notes={notes}
                    selectedNoteId={selectedNoteId}
                    decryptedTitles={decryptedTitles}
                    onSelectNote={onSelectNote}
                    onDeleteNote={onDeleteNote}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    dragDrop={dragDrop}
                />
            </Box>
        </Box>
    );
}

import React, { memo, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    Tooltip,
    ListItemButton,
    ListItemText,
    alpha,
    useTheme,
    LinearProgress
} from '@mui/material';
import {
    Search,
    Tag,
    Close as CloseIcon,
    Delete
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import type { NoteMetadata, NoteFolder } from '../../services/noteService';
import { useFolderDragDrop } from '../../hooks/useFolderDragDrop';

interface NotesPanelProps {
    notes: NoteMetadata[];
    folders: NoteFolder[];
    selectedFolderId: string | null;
    selectedNoteId: string | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSelectNote: (note: NoteMetadata) => void;
    onDeleteNote: (id: string, e: React.MouseEvent) => void;
    userTags: string[];
    selectedTags: string[];
    onToggleTag: (tag: string) => void;
    isLoading: boolean;
    isRefreshing?: boolean;
    decryptedTitles: Map<string, string>;
    dragDrop: ReturnType<typeof useFolderDragDrop>;
    onPreviewChange: (note: NoteMetadata | null) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isFetchingMore?: boolean;
}

// Hover preview delay in ms
const HOVER_DELAY = 150; // Delay before showing preview (debounce)

// Memoized Note Item with hover preview support
const NoteItem = memo(({
    note,
    isSelected,
    decryptedTitle,
    onSelect,
    onDelete,
    onDragStart,
    onDragEnd,
    onHoverStart,
    onHoverEnd,
    theme,
    index
}: {
    note: NoteMetadata;
    isSelected: boolean;
    decryptedTitle: string;
    onSelect: (note: NoteMetadata) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onHoverStart: (note: NoteMetadata) => void;
    onHoverEnd: () => void;
    theme: any;
    index: number;
}) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const isInitial = index < 12;

    return (
        <motion.div
            ref={itemRef}
            initial={isInitial ? { opacity: 0, y: 10 } : false}
            animate={{
                opacity: 1,
                y: 0,
                transitionEnd: { transform: 'none' }
            }}
            transition={{
                duration: 0.3,
                delay: isInitial ? Math.min(index * 0.04, 0.4) : 0,
                ease: [0.23, 1, 0.32, 1]
            }}
        >
            <ListItemButton
                selected={isSelected}
                onClick={() => onSelect(note)}
                draggable
                onDragStart={(e) => onDragStart(e, note._id)}
                onDragEnd={onDragEnd}
                onMouseEnter={() => onHoverStart(note)}
                onMouseLeave={onHoverEnd}
                sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: '12px',
                    transition: 'background-color 0.2s, transform 0.2s',
                    cursor: 'pointer',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateX(4px)'
                    },
                    '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.16),
                        },
                    },
                }}
            >
                <ListItemText
                    primary={
                        <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: 600 }}
                        >
                            {decryptedTitle || 'Decrypting...'}
                        </Typography>
                    }
                    secondary={
                        <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.disabled">
                                {new Date(note.updatedAt).toLocaleDateString()}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {note.tags.slice(0, 2).map((tag: string) => (
                                    <Chip
                                        key={tag}
                                        label={tag}
                                        size="small"
                                        sx={{ height: 18, fontSize: '0.65rem', borderRadius: '6px' }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    }
                    slotProps={{
                        secondary: { component: 'div' }
                    }}
                />
                <Tooltip title="Delete">
                    <IconButton
                        size="small"
                        onClick={(e) => onDelete(note._id, e)}
                        sx={{
                            opacity: 0,
                            ml: 1,
                            '.MuiListItemButton-root:hover &': { opacity: 0.5 },
                            '&:hover': {
                                opacity: '1 !important',
                                color: 'error.main',
                            }
                        }}
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                </Tooltip>
            </ListItemButton>
        </motion.div>
    );
}, (prev, next) => {
    return (
        prev.isSelected === next.isSelected &&
        prev.decryptedTitle === next.decryptedTitle &&
        prev.note.updatedAt === next.note.updatedAt &&
        prev.note._id === next.note._id &&
        prev.index === next.index
    );
});

export const NotesPanel: React.FC<NotesPanelProps> = ({
    notes,
    folders,
    selectedFolderId,
    selectedNoteId,
    searchQuery,
    onSearchChange,
    onSelectNote,
    onDeleteNote,
    userTags,
    selectedTags,
    onToggleTag,
    isLoading,
    isRefreshing = false,
    decryptedTitles,
    dragDrop,
    onPreviewChange,
    onLoadMore,
    hasMore = false,
    isFetchingMore = false
}) => {
    const theme = useTheme();
    const { handleNoteDragStart, handleNoteDragEnd, isDragging } = dragDrop;

    // Timeouts for debouncing
    const enterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleHoverStart = useCallback((note: NoteMetadata) => {
        // Don't show preview while dragging
        if (isDragging) return;

        // Cancel any pending "enter" action (debounce)
        if (enterTimeoutRef.current) {
            clearTimeout(enterTimeoutRef.current);
            enterTimeoutRef.current = null;
        }

        // Schedule showing this note
        enterTimeoutRef.current = setTimeout(() => {
            onPreviewChange(note);
            enterTimeoutRef.current = null;
        }, HOVER_DELAY);
    }, [isDragging, onPreviewChange]);

    const handleHoverEnd = useCallback(() => {
        // Cancel pending "enter" action
        if (enterTimeoutRef.current) {
            clearTimeout(enterTimeoutRef.current);
            enterTimeoutRef.current = null;
        }
    }, []);

    const folderName = selectedFolderId
        ? folders.find(f => f._id === selectedFolderId)?.name || 'Folder'
        : 'All Notes';

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            bgcolor: 'background.paper',
            borderRadius: '16px',
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Header */}
            <Box sx={{
                p: 2,
                borderBottom: 1,
                borderColor: alpha(theme.palette.divider, 0.1),
                flexShrink: 0
            }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    {folderName}
                </Typography>

                {/* Search */}
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: alpha(theme.palette.background.default, 0.5),
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

            {/* Tag Filters */}
            {userTags.length > 0 && (
                <Box sx={{
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    borderBottom: 1,
                    borderColor: alpha(theme.palette.divider, 0.1),
                    flexShrink: 0
                }}>
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


            {/* Notes List Area */}
            <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {(isLoading || isRefreshing) && (
                    <LinearProgress
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 10,
                            height: 2,
                            backgroundColor: 'transparent',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 1
                            }
                        }}
                    />
                )}
                {notes.length === 0 ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: 'text.secondary',
                        gap: 1,
                        position: 'relative',
                        opacity: isLoading ? 0.5 : 1,
                        transition: 'opacity 0.2s'
                    }}>
                        <Typography variant="body2">No notes found</Typography>
                        <Typography variant="caption" color="text.disabled">
                            Create a new note to get started
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{
                        height: '100%',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'opacity 0.2s',
                        '& .virtuoso-scrollbar': {
                            scrollbarGutter: 'stable',
                        }
                    }}>
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={notes}
                            increaseViewportBy={1200} // Significant overscan for desktop
                            endReached={onLoadMore}
                            components={{
                                Footer: () => isFetchingMore ? (
                                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                                        <LinearProgress sx={{ width: '40%', height: 2, borderRadius: 1 }} />
                                    </Box>
                                ) : hasMore ? (
                                    <Box sx={{ height: 40 }} />
                                ) : null
                            }}
                            itemContent={(index, note) => (
                                <Box sx={{ p: 0 }}>
                                    <NoteItem
                                        note={note}
                                        index={index}
                                        isSelected={selectedNoteId === note._id}
                                        decryptedTitle={decryptedTitles.get(note._id) || ''}
                                        onSelect={onSelectNote}
                                        onDelete={onDeleteNote}
                                        onDragStart={handleNoteDragStart}
                                        onDragEnd={handleNoteDragEnd}
                                        onHoverStart={handleHoverStart}
                                        onHoverEnd={handleHoverEnd}
                                        theme={theme}
                                    />
                                </Box>
                            )}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
};

import React, { memo, useState, useCallback, useRef } from 'react';
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
    CircularProgress,
    Popper,
    Paper,
    Fade
} from '@mui/material';
import {
    Search,
    Tag,
    Close as CloseIcon,
    Delete
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { NoteMetadata, NoteFolder } from '../../services/noteService';
import { useFolderDragDrop } from '../../hooks/useFolderDragDrop';

const ITEMS_PER_PAGE = 30;

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
    decryptedTitles: Record<string, string>;
    dragDrop: ReturnType<typeof useFolderDragDrop>;
}

// Hover preview delay in ms - fast for responsiveness
const HOVER_DELAY = 200;
const HOVER_OUT_DELAY = 100;

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
    onHoverStart: (note: NoteMetadata, element: HTMLElement) => void;
    onHoverEnd: () => void;
    theme: any;
    index: number;
}) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => {
            if (itemRef.current) {
                onHoverStart(note, itemRef.current);
            }
        }, HOVER_DELAY);
    }, [note, onHoverStart]);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        onHoverEnd();
    }, [onHoverEnd]);

    return (
        <motion.div
            ref={itemRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                delay: Math.min(index * 0.04, 0.4), // Cap delay for large pages
                ease: [0.23, 1, 0.32, 1] // Premium ease-out
            }}
        >
            <ListItemButton
                selected={isSelected}
                onClick={() => onSelect(note)}
                draggable
                onDragStart={(e) => onDragStart(e, note._id)}
                onDragEnd={onDragEnd}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: '12px',
                    transition: 'background-color 0.2s, transform 0.2s',
                    cursor: 'pointer',
                    willChange: 'transform',
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

// Format relative time for preview
const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

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
    decryptedTitles,
    dragDrop
}) => {
    const theme = useTheme();
    const { handleNoteDragStart, handleNoteDragEnd, isDragging } = dragDrop;

    // Pagination state
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

    // Reset visible count when notes change (e.g., folder switch, search)
    React.useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [selectedFolderId, searchQuery]);

    const visibleNotes = notes.slice(0, visibleCount);
    const hasMore = notes.length > visibleCount;

    const handleLoadMore = useCallback(() => {
        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }, []);

    // Hover preview state
    const [previewNote, setPreviewNote] = useState<NoteMetadata | null>(null);
    const [previewAnchor, setPreviewAnchor] = useState<HTMLElement | null>(null);
    const hoverOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleHoverStart = useCallback((note: NoteMetadata, element: HTMLElement) => {
        // Don't show preview while dragging
        if (isDragging) return;

        if (hoverOutTimeoutRef.current) {
            clearTimeout(hoverOutTimeoutRef.current);
            hoverOutTimeoutRef.current = null;
        }
        setPreviewNote(note);
        setPreviewAnchor(element);
    }, [isDragging]);

    const handleHoverEnd = useCallback(() => {
        hoverOutTimeoutRef.current = setTimeout(() => {
            setPreviewNote(null);
            setPreviewAnchor(null);
        }, HOVER_OUT_DELAY);
    }, []);

    const handlePreviewMouseEnter = useCallback(() => {
        if (hoverOutTimeoutRef.current) {
            clearTimeout(hoverOutTimeoutRef.current);
            hoverOutTimeoutRef.current = null;
        }
    }, []);

    const handlePreviewMouseLeave = useCallback(() => {
        setPreviewNote(null);
        setPreviewAnchor(null);
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

            {/* Notes List */}
            <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {/* Subtle loading bar for filtering/refreshing */}
                {isLoading && notes.length > 0 && (
                    <CircularProgress
                        size={20}
                        sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            zIndex: 10,
                            opacity: 0.6
                        }}
                    />
                )}

                {isLoading && notes.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : notes.length === 0 ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: 'text.secondary',
                        gap: 1
                    }}>
                        <Typography variant="body2">No notes found</Typography>
                        <Typography variant="caption" color="text.disabled">
                            Create a new note to get started
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        height: '100%',
                        scrollbarGutter: 'stable',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'opacity 0.2s'
                    }}>
                        <AnimatePresence mode="popLayout" initial={false}>
                            {visibleNotes.map((note, index) => (
                                <NoteItem
                                    key={note._id}
                                    note={note}
                                    index={index}
                                    isSelected={selectedNoteId === note._id}
                                    decryptedTitle={decryptedTitles[note._id] || ''}
                                    onSelect={onSelectNote}
                                    onDelete={onDeleteNote}
                                    onDragStart={handleNoteDragStart}
                                    onDragEnd={handleNoteDragEnd}
                                    onHoverStart={handleHoverStart}
                                    onHoverEnd={handleHoverEnd}
                                    theme={theme}
                                />
                            ))}
                        </AnimatePresence>
                        {hasMore && (
                            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                                <Chip
                                    label={`Load more (${notes.length - visibleCount} remaining)`}
                                    onClick={handleLoadMore}
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.15)
                                        }
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

            {/* Hover Preview Popper */}
            <Popper
                open={Boolean(previewNote && previewAnchor && !isDragging)}
                anchorEl={previewAnchor}
                placement="right-start"
                transition
                sx={{ zIndex: 1200 }}
                modifiers={[
                    { name: 'offset', options: { offset: [0, 8] } },
                    { name: 'preventOverflow', options: { boundary: 'viewport', padding: 16 } }
                ]}
            >
                {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={150}>
                        <Paper
                            elevation={12}
                            onMouseEnter={handlePreviewMouseEnter}
                            onMouseLeave={handlePreviewMouseLeave}
                            sx={{
                                width: 320,
                                maxHeight: 280,
                                overflow: 'hidden',
                                borderRadius: '12px',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                bgcolor: 'background.paper',
                            }}
                        >
                            {previewNote && (
                                <>
                                    {/* Preview Header */}
                                    <Box sx={{
                                        p: 2,
                                        borderBottom: 1,
                                        borderColor: alpha(theme.palette.divider, 0.1),
                                        bgcolor: alpha(theme.palette.primary.main, 0.03)
                                    }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                                            {decryptedTitles[previewNote._id] || 'Untitled'}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">
                                            {new Date(previewNote.updatedAt).toLocaleString()}
                                        </Typography>
                                    </Box>

                                    {/* Preview Info */}
                                    <Box sx={{ p: 2 }}>
                                        {/* Tags */}
                                        {previewNote.tags.length > 0 && (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                                                {previewNote.tags.slice(0, 4).map((tag: string) => (
                                                    <Chip
                                                        key={tag}
                                                        label={tag}
                                                        size="small"
                                                        sx={{ height: 20, fontSize: '0.7rem', borderRadius: '6px' }}
                                                    />
                                                ))}
                                            </Box>
                                        )}

                                        {/* Metadata */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Modified: {getRelativeTime(new Date(previewNote.updatedAt))}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Created: {new Date(previewNote.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Click hint */}
                                    <Box sx={{
                                        px: 2,
                                        py: 1,
                                        borderTop: 1,
                                        borderColor: alpha(theme.palette.divider, 0.1),
                                        bgcolor: alpha(theme.palette.background.default, 0.5)
                                    }}>
                                        <Typography variant="caption" color="text.disabled">
                                            Click to open
                                        </Typography>
                                    </Box>
                                </>
                            )}
                        </Paper>
                    </Fade>
                )}
            </Popper>
        </Box>
    );
};

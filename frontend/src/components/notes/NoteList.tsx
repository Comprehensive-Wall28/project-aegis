import React, { memo } from 'react';
import {
    Box,
    Typography,
    ListItemButton,
    ListItemText,
    Chip,
    IconButton,
    Tooltip,
    alpha,
    useTheme,
    LinearProgress,
    useMediaQuery
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import type { NoteMetadata } from '../../services/noteService';
import { useFolderDragDrop } from '../../hooks/useFolderDragDrop';

interface NoteListProps {
    notes: NoteMetadata[];
    selectedNoteId: string | null;
    decryptedTitles: Map<string, string>;
    onSelectNote: (note: NoteMetadata) => void;
    onDeleteNote: (id: string, e: React.MouseEvent) => void;
    isLoading: boolean;
    isRefreshing?: boolean;
    dragDrop: ReturnType<typeof useFolderDragDrop>;
}

// Memoized Note Item
const NoteItem = memo(({
    note,
    isSelected,
    decryptedTitle,
    onSelect,
    onDelete,
    onDragStart,
    onDragEnd,
    theme,
    index,
    isMobile
}: {
    note: NoteMetadata;
    isSelected: boolean;
    decryptedTitle: string;
    onSelect: (note: NoteMetadata) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    theme: any;
    index: number;
    isMobile: boolean;
}) => {
    const isInitial = index < 10;

    return (
        <motion.div
            initial={isInitial ? { opacity: 0, x: -10 } : false}
            animate={{
                opacity: 1,
                x: 0,
                transitionEnd: { transform: 'none' }
            }}
            exit={{ opacity: 0, x: -10 }}
            transition={{
                duration: 0.25,
                delay: isInitial ? Math.min(index * 0.03, 0.3) : 0,
                ease: "easeOut"
            }}
        >
            <ListItemButton
                selected={isSelected}
                onClick={() => onSelect(note)}
                draggable
                onDragStart={(e) => onDragStart(e, note._id)}
                onDragEnd={onDragEnd}
                sx={{
                    mx: 1,
                    my: 0.25,
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    cursor: 'grab',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    '&:active': { cursor: 'grabbing' },
                    '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
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
                                {note.tags.slice(0, 1).map((tag: string) => (
                                    <Chip
                                        key={tag}
                                        label={tag}
                                        size="small"
                                        sx={{ height: 16, fontSize: '0.6rem', borderRadius: '4px' }}
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
                            opacity: isMobile ? 1 : 0,
                            '.MuiListItemButton-root:hover &': { opacity: isMobile ? 1 : 0.5 },
                            '&:hover': {
                                opacity: 1 + ' !important',
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
        prev.index === next.index &&
        prev.isMobile === next.isMobile
    );
});

export const NoteList: React.FC<NoteListProps> = ({
    notes,
    selectedNoteId,
    decryptedTitles,
    onSelectNote,
    onDeleteNote,
    isLoading,
    isRefreshing = false,
    dragDrop
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { handleNoteDragStart, handleNoteDragEnd } = dragDrop;

    return (
        <Box sx={{
            flex: 1,
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarGutter: 'stable',
            borderTop: 1,
            borderColor: alpha(theme.palette.divider, 0.1),
            position: 'relative',
            opacity: (isLoading && notes.length > 0) || isRefreshing ? 0.7 : 1,
            transition: 'opacity 0.2s'
        }}>
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
                    p: 3,
                    opacity: (isLoading || isRefreshing) ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                }}>
                    {!(isLoading || isRefreshing) && <Typography variant="body2">No notes found</Typography>}
                </Box>
            ) : (
                <Virtuoso
                    style={{ height: '100%' }}
                    data={notes}
                    increaseViewportBy={800} // Significant overscan for mobile
                    itemContent={(index, note) => (
                        <Box sx={{ py: 0 }}>
                            <NoteItem
                                note={note}
                                index={index}
                                isSelected={selectedNoteId === note._id}
                                decryptedTitle={decryptedTitles.get(note._id) || ''}
                                onSelect={onSelectNote}
                                onDelete={onDeleteNote}
                                onDragStart={handleNoteDragStart}
                                onDragEnd={handleNoteDragEnd}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        </Box>
                    )}
                />
            )}
        </Box>
    );
};

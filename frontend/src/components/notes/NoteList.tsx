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
    CircularProgress
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { motion } from 'framer-motion';
import type { NoteMetadata } from '../../services/noteService';
import { useFolderDragDrop } from '../../hooks/useFolderDragDrop';

interface NoteListProps {
    notes: NoteMetadata[];
    selectedNoteId: string | null;
    decryptedTitles: Record<string, string>;
    onSelectNote: (note: NoteMetadata) => void;
    onDeleteNote: (id: string, e: React.MouseEvent) => void;
    isLoading: boolean;
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
    theme
}: {
    note: NoteMetadata;
    isSelected: boolean;
    decryptedTitle: string;
    onSelect: (note: NoteMetadata) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    theme: any;
}) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
        layout
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
                        opacity: 0,
                        '.MuiListItemButton-root:hover &': { opacity: 0.5 },
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
), (prev, next) => {
    return (
        prev.isSelected === next.isSelected &&
        prev.decryptedTitle === next.decryptedTitle &&
        prev.note.updatedAt === next.note.updatedAt &&
        prev.note._id === next.note._id
    );
});

import { Virtuoso } from 'react-virtuoso';

export const NoteList: React.FC<NoteListProps> = ({
    notes,
    selectedNoteId,
    decryptedTitles,
    onSelectNote,
    onDeleteNote,
    isLoading,
    dragDrop
}) => {
    const theme = useTheme();
    const { handleNoteDragStart, handleNoteDragEnd } = dragDrop;

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, flex: 1, borderTop: 1, borderColor: alpha(theme.palette.divider, 0.1) }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (notes.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary', flex: 1, borderTop: 1, borderColor: alpha(theme.palette.divider, 0.1) }}>
                <Typography variant="body2">No notes found</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            flex: 1,
            // Virtualization handles overflow
            height: '100%',
            borderTop: 1,
            borderColor: alpha(theme.palette.divider, 0.1),
        }}>
            <Virtuoso
                style={{ height: '100%' }}
                data={notes}
                itemContent={(_index, note) => (
                    <Box sx={{ py: 0 }}>
                        <NoteItem
                            key={note._id}
                            note={note}
                            isSelected={selectedNoteId === note._id}
                            decryptedTitle={decryptedTitles[note._id] || ''}
                            onSelect={onSelectNote}
                            onDelete={onDeleteNote}
                            onDragStart={handleNoteDragStart}
                            onDragEnd={handleNoteDragEnd}
                            theme={theme}
                        />
                    </Box>
                )}
            />
        </Box>
    );
};


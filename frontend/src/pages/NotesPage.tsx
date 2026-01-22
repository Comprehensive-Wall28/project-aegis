import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemText,
    IconButton,
    Tooltip,
    CircularProgress,
    Chip,
    TextField,
    InputAdornment,
    Paper,
    Divider,
    Alert,
} from '@mui/material';
import {
    Add,
    Delete,
    Search,
    NoteAlt,
    Tag,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import AegisEditor from '../components/notes/AegisEditor';
import noteService from '../services/noteService';
import type { NoteMetadata } from '../services/noteService';
import { useNoteEncryption } from '../hooks/useNoteEncryption';
import type { NoteContent } from '../hooks/useNoteEncryption';
import type { JSONContent } from '@tiptap/react';

interface DecryptedNote {
    metadata: NoteMetadata;
    content: NoteContent | null;
}

const NotesPage: React.FC = () => {
    const [notes, setNotes] = useState<NoteMetadata[]>([]);
    const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [userTags, setUserTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const { encryptNoteContent, decryptNoteContent, generateNoteHash } = useNoteEncryption();

    // Load notes list
    const loadNotes = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [notesList, tags] = await Promise.all([
                noteService.getNotes({ tags: selectedTags.length > 0 ? selectedTags : undefined }),
                noteService.getUserTags(),
            ]);
            setNotes(notesList);
            setUserTags(tags);
        } catch (err: any) {
            setError(err.message || 'Failed to load notes');
        } finally {
            setIsLoading(false);
        }
    }, [selectedTags]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    // Select and load note content
    const handleSelectNote = useCallback(async (note: NoteMetadata) => {
        if (selectedNote?.metadata._id === note._id) return;

        try {
            setIsLoadingContent(true);
            setError(null);

            const contentResponse = await noteService.getNoteContent(note._id);
            const decryptedContent = await decryptNoteContent(
                contentResponse.encryptedContent,
                contentResponse.encapsulatedKey,
                contentResponse.encryptedSymmetricKey
            );

            setSelectedNote({
                metadata: note,
                content: decryptedContent,
            });
        } catch (err: any) {
            setError(err.message || 'Failed to load note content');
        } finally {
            setIsLoadingContent(false);
        }
    }, [selectedNote, decryptNoteContent]);

    // Create new note
    const handleCreateNote = useCallback(async () => {
        try {
            setError(null);
            const emptyContent: NoteContent = {
                type: 'doc',
                content: [{ type: 'paragraph' }],
            };

            const encrypted = await encryptNoteContent(emptyContent);
            const recordHash = await generateNoteHash(emptyContent, []);

            const newNote = await noteService.createNote({
                ...encrypted,
                recordHash,
                tags: [],
            });

            setNotes(prev => [newNote, ...prev]);
            setSelectedNote({
                metadata: newNote,
                content: emptyContent,
            });
        } catch (err: any) {
            setError(err.message || 'Failed to create note');
        }
    }, [encryptNoteContent, generateNoteHash]);

    // Save note content
    const handleSaveContent = useCallback(async (content: JSONContent) => {
        if (!selectedNote) return;

        try {
            const noteContent = content as NoteContent;
            const encrypted = await encryptNoteContent(noteContent);
            const recordHash = await generateNoteHash(noteContent, selectedNote.metadata.tags);

            const updatedNote = await noteService.updateNoteContent(selectedNote.metadata._id, {
                ...encrypted,
                recordHash,
            });

            setSelectedNote(prev => prev ? {
                ...prev,
                metadata: updatedNote,
                content: noteContent,
            } : null);

            // Update notes list metadata
            setNotes(prev => prev.map(n =>
                n._id === updatedNote._id ? updatedNote : n
            ));
        } catch (err: any) {
            console.error('Failed to save note:', err);
            throw err; // Re-throw to let editor know save failed
        }
    }, [selectedNote, encryptNoteContent, generateNoteHash]);

    // Delete note
    const handleDeleteNote = useCallback(async (noteId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!window.confirm('Are you sure you want to delete this note?')) return;

        try {
            await noteService.deleteNote(noteId);
            setNotes(prev => prev.filter(n => n._id !== noteId));
            if (selectedNote?.metadata._id === noteId) {
                setSelectedNote(null);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete note');
        }
    }, [selectedNote]);

    // Filter notes by search
    const filteredNotes = notes.filter(note => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return note.tags.some(tag => tag.toLowerCase().includes(query));
    });

    // Toggle tag filter
    const handleToggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <Box sx={{
            display: 'flex',
            height: 'calc(100vh - 64px)',
            overflow: 'hidden',
        }}>
            {/* Sidebar */}
            <Paper
                elevation={0}
                sx={{
                    width: 320,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: 1,
                    borderColor: 'divider',
                    borderRadius: 0,
                }}
            >
                {/* Header */}
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NoteAlt color="primary" />
                    <Typography variant="h6" sx={{ flex: 1 }}>Notes</Typography>
                    <Tooltip title="New Note">
                        <IconButton color="primary" onClick={handleCreateNote} size="small">
                            <Add />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Divider />

                {/* Search */}
                <Box sx={{ p: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search by tags..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search fontSize="small" />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </Box>

                {/* Tag Filters */}
                {userTags.length > 0 && (
                    <Box sx={{ px: 1, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {userTags.slice(0, 8).map(tag => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                icon={<Tag fontSize="small" />}
                                onClick={() => handleToggleTag(tag)}
                                color={selectedTags.includes(tag) ? 'primary' : 'default'}
                                variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                            />
                        ))}
                    </Box>
                )}

                <Divider />

                {/* Notes List */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : filteredNotes.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                            <Typography variant="body2">
                                {notes.length === 0
                                    ? 'No notes yet. Create your first note!'
                                    : 'No notes match your search.'}
                            </Typography>
                        </Box>
                    ) : (
                        <List disablePadding>
                            <AnimatePresence>
                                {filteredNotes.map(note => (
                                    <motion.div
                                        key={note._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <ListItemButton
                                            selected={selectedNote?.metadata._id === note._id}
                                            onClick={() => handleSelectNote(note)}
                                            sx={{
                                                borderBottom: 1,
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography
                                                        variant="body2"
                                                        noWrap
                                                        sx={{ fontWeight: 500 }}
                                                    >
                                                        {new Date(note.updatedAt).toLocaleDateString()}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Box component="span" sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                                        {note.tags.slice(0, 2).map(tag => (
                                                            <Chip
                                                                key={tag}
                                                                label={tag}
                                                                size="small"
                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                            />
                                                        ))}
                                                        {note.tags.length > 2 && (
                                                            <Typography variant="caption" color="text.secondary" component="span">
                                                                +{note.tags.length - 2}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                                slotProps={{
                                                    secondary: { component: 'div' }
                                                }}
                                            />
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleDeleteNote(note._id, e)}
                                                    sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </ListItemButton>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </List>
                    )}
                </Box>
            </Paper>

            {/* Editor Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {error && (
                    <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
                )}

                {isLoadingContent ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                        <CircularProgress />
                    </Box>
                ) : selectedNote ? (
                    <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        <AegisEditor
                            key={selectedNote.metadata._id}
                            initialContent={selectedNote.content as JSONContent}
                            onSave={handleSaveContent}
                        />
                    </Box>
                ) : (
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'text.secondary',
                    }}>
                        <NoteAlt sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                        <Typography variant="h6">Select a note or create a new one</Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                            Your notes are end-to-end encrypted
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default NotesPage;

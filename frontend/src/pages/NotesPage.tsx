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
    Alert,
    alpha,
    useTheme,
    useMediaQuery,
    Button,
    Drawer,
} from '@mui/material';
import {
    Add,
    Delete,
    Search,
    NoteAlt,
    Tag,
    ArrowBack,
    Close as CloseIcon,
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [notes, setNotes] = useState<NoteMetadata[]>([]);
    const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [userTags, setUserTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

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
        if (selectedNote?.metadata._id === note._id) {
            if (isMobile) setMobileEditorOpen(true);
            return;
        }

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

            if (isMobile) setMobileEditorOpen(true);
        } catch (err: any) {
            setError(err.message || 'Failed to load note content');
        } finally {
            setIsLoadingContent(false);
        }
    }, [selectedNote, decryptNoteContent, isMobile]);

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

            if (isMobile) setMobileEditorOpen(true);
        } catch (err: any) {
            setError(err.message || 'Failed to create note');
        }
    }, [encryptNoteContent, generateNoteHash, isMobile]);

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
                if (isMobile) setMobileEditorOpen(false);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete note');
        }
    }, [selectedNote, isMobile]);

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

    // Handle mobile back
    const handleMobileBack = () => {
        setMobileEditorOpen(false);
    };

    // Notes list sidebar content
    const NotesListContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <NoteAlt sx={{ color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>Notes</Typography>
                <Tooltip title="New Note">
                    <IconButton
                        color="primary"
                        onClick={handleCreateNote}
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

            {/* Search */}
            <Box sx={{ px: 2, pb: 1.5 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by tags..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
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
                                        onClick={() => setSearchQuery('')}
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
                <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {userTags.slice(0, 8).map(tag => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            icon={<Tag fontSize="small" />}
                            onClick={() => handleToggleTag(tag)}
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
            <Box sx={{
                flex: 1,
                overflow: 'auto',
                borderTop: 1,
                borderColor: alpha(theme.palette.divider, 0.1),
            }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : filteredNotes.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                        <NoteAlt sx={{ fontSize: 48, mb: 1.5, opacity: 0.3 }} />
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
                                            mx: 1,
                                            my: 0.5,
                                            borderRadius: '12px',
                                            transition: 'all 0.2s',
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
                                                    {new Date(note.updatedAt).toLocaleDateString()}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box component="span" sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                                    {note.tags.slice(0, 2).map(tag => (
                                                        <Chip
                                                            key={tag}
                                                            label={tag}
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.7rem',
                                                                borderRadius: '6px',
                                                            }}
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
                                                sx={{
                                                    opacity: 0.5,
                                                    '&:hover': {
                                                        opacity: 1,
                                                        color: 'error.main',
                                                    }
                                                }}
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
        </Box>
    );

    // Editor content
    const EditorContent = (
        <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            bgcolor: 'background.default',
        }}>
            {error && (
                <Alert
                    severity="error"
                    sx={{
                        m: 2,
                        borderRadius: '12px',
                    }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
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
                    p: 3,
                }}>
                    <NoteAlt sx={{ fontSize: 80, mb: 2, opacity: 0.15 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Select a note or create a new one
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                        Your notes are end-to-end encrypted
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleCreateNote}
                        sx={{
                            mt: 3,
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                        }}
                    >
                        Create Note
                    </Button>
                </Box>
            )}
        </Box>
    );

    // Mobile layout with drawer
    if (isMobile) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Mobile Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    pb: 1,
                }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <NoteAlt sx={{ color: 'primary.main' }} />
                        Secure Notes
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleCreateNote}
                        size="small"
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                        }}
                    >
                        New
                    </Button>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
                    PQC-encrypted note taking
                </Typography>

                {/* Notes List */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        mx: 2,
                        mb: 2,
                        borderRadius: '16px',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {NotesListContent}
                </Paper>

                {/* Mobile Editor Drawer */}
                <Drawer
                    anchor="right"
                    open={mobileEditorOpen}
                    onClose={handleMobileBack}
                    PaperProps={{
                        sx: {
                            width: '100%',
                            bgcolor: 'background.default',
                        },
                    }}
                >
                    {/* Mobile Editor Header */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 2,
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}>
                        <IconButton onClick={handleMobileBack} edge="start">
                            <ArrowBack />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {selectedNote ? new Date(selectedNote.metadata.updatedAt).toLocaleDateString() : 'Note'}
                        </Typography>
                    </Box>
                    {EditorContent}
                </Drawer>
            </Box>
        );
    }

    // Desktop layout
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                        }}
                    >
                        <NoteAlt sx={{ fontSize: 32, color: 'primary.main' }} />
                        Secure Notes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        PQC-encrypted note taking
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateNote}
                    sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                    }}
                >
                    New Note
                </Button>
            </Box>

            {/* Main Content */}
            <Box sx={{
                display: 'flex',
                gap: 2,
                flex: 1,
                minHeight: 0,
            }}>
                {/* Sidebar */}
                <Paper
                    elevation={0}
                    sx={{
                        width: 320,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        overflow: 'hidden',
                    }}
                >
                    {NotesListContent}
                </Paper>

                {/* Editor Area */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        overflow: 'hidden',
                    }}
                >
                    {EditorContent}
                </Paper>
            </Box>
        </Box>
    );
};

export default NotesPage;

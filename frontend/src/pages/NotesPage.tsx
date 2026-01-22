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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Collapse,
} from '@mui/material';
import {
    Add,
    Delete,
    Search,
    NoteAlt,
    Tag,
    ArrowBack,
    Close as CloseIcon,
    Folder,
    FolderOpen,
    CreateNewFolder,
    Edit as EditIcon,
    ChevronRight,
    ExpandMore,
    Menu as MenuIcon,
    MenuOpen as MenuOpenIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import AegisEditor from '../components/notes/AegisEditor';
import { NoteFullView } from '../components/notes/NoteFullView';
import noteService from '../services/noteService';
import type { NoteMetadata, NoteFolder } from '../services/noteService';
import { useNoteEncryption } from '../hooks/useNoteEncryption';
import { useSessionStore } from '../stores/sessionStore';
import type { NoteContent } from '../hooks/useNoteEncryption';
import type { JSONContent } from '@tiptap/react';

interface DecryptedNote {
    metadata: NoteMetadata;
    content: NoteContent | null;
}

const NotesPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { pqcEngineStatus } = useSessionStore();

    const [notes, setNotes] = useState<NoteMetadata[]>([]);
    const [folders, setFolders] = useState<NoteFolder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [userTags, setUserTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
    const [decryptedTitles, setDecryptedTitles] = useState<Record<string, string>>({});

    // UI States
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [foldersExpanded, setFoldersExpanded] = useState(true);
    const [fullViewOpen, setFullViewOpen] = useState(false);

    // Drag and Drop state
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    // Dialog states
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename'>('create');
    const [folderDialogValue, setFolderDialogValue] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmMode, setDeleteConfirmMode] = useState<'note' | 'folder'>('note');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

    const {
        encryptNoteContent,
        decryptNoteContent,
        deriveAesKey,
        decryptString,
        encryptString,
        generateNoteHash
    } = useNoteEncryption();

    // Decrypt note titles
    const decryptTitles = useCallback(async (notesToDecrypt: NoteMetadata[]) => {
        if (pqcEngineStatus !== 'operational') return;

        const newTitles: Record<string, string> = { ...decryptedTitles };
        let changed = false;

        for (const note of notesToDecrypt) {
            if (note.encryptedTitle && !newTitles[note._id]) {
                try {
                    const aesKey = await deriveAesKey(note.encapsulatedKey, note.encryptedSymmetricKey);
                    const title = await decryptString(note.encryptedTitle, aesKey);
                    newTitles[note._id] = title;
                    changed = true;
                } catch (err) {
                    console.error('Failed to decrypt title for note:', note._id, err);
                    newTitles[note._id] = 'Untitled Note';
                    changed = true;
                }
            } else if (!note.encryptedTitle && !newTitles[note._id]) {
                newTitles[note._id] = 'Untitled Note';
                changed = true;
            }
        }

        if (changed) {
            setDecryptedTitles(newTitles);
        }
    }, [deriveAesKey, decryptString, decryptedTitles, pqcEngineStatus]);

    // Load notes and folders
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [notesList, foldersList, tags] = await Promise.all([
                noteService.getNotes({
                    tags: selectedTags.length > 0 ? selectedTags : undefined,
                    folderId: selectedFolderId || undefined
                }),
                noteService.getFolders(),
                noteService.getUserTags(),
            ]);
            setNotes(notesList);
            setFolders(foldersList);
            setUserTags(tags);

            // Start decrypting titles in background if engine is ready
            if (pqcEngineStatus === 'operational') {
                decryptTitles(notesList);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [selectedTags, selectedFolderId, decryptTitles, pqcEngineStatus]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Retry decryption when PQC engine becomes operational
    useEffect(() => {
        if (pqcEngineStatus === 'operational' && notes.length > 0) {
            decryptTitles(notes);
        }
    }, [pqcEngineStatus, notes, decryptTitles]);

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

            // Encrypt default title
            const aesKey = await deriveAesKey(encrypted.encapsulatedKey, encrypted.encryptedSymmetricKey);
            const encryptedTitle = await encryptString('New Note', aesKey);

            const recordHash = await generateNoteHash(emptyContent, [], 'New Note');

            const newNote = await noteService.createNote({
                ...encrypted,
                encryptedTitle,
                noteFolderId: selectedFolderId || undefined,
                recordHash,
                tags: [],
            });

            setNotes(prev => [newNote, ...prev]);
            setDecryptedTitles(prev => ({ ...prev, [newNote._id]: 'New Note' }));
            setSelectedNote({
                metadata: newNote,
                content: emptyContent,
            });

            if (isMobile) setMobileEditorOpen(true);
        } catch (err: any) {
            setError(err.message || 'Failed to create note');
        }
    }, [encryptNoteContent, deriveAesKey, encryptString, generateNoteHash, selectedFolderId, isMobile]);

    // Save note content and metadata (including title)
    const handleSaveContent = useCallback(async (content: JSONContent, title?: string) => {
        if (!selectedNote) return;

        try {
            const noteContent = content as NoteContent;
            const encrypted = await encryptNoteContent(noteContent);

            // Derive key and encrypt new title if provided
            let encryptedTitle = selectedNote.metadata.encryptedTitle;
            if (title !== undefined) {
                const aesKey = await deriveAesKey(encrypted.encapsulatedKey, encrypted.encryptedSymmetricKey);
                encryptedTitle = await encryptString(title, aesKey);
            }

            const recordHash = await generateNoteHash(noteContent, selectedNote.metadata.tags, title || decryptedTitles[selectedNote.metadata._id]);

            const updatedNote = await noteService.updateNoteContent(selectedNote.metadata._id, {
                ...encrypted,
                recordHash,
            });

            // If title changed, we also need to update metadata
            let finalNote = updatedNote;
            if (title !== undefined && title !== decryptedTitles[selectedNote.metadata._id]) {
                finalNote = await noteService.updateNoteMetadata(selectedNote.metadata._id, {
                    encryptedTitle,
                });
                setDecryptedTitles(prev => ({ ...prev, [finalNote._id]: title }));
            }

            setSelectedNote(prev => prev ? {
                ...prev,
                metadata: finalNote,
                content: noteContent,
            } : null);

            // Update notes list metadata
            setNotes(prev => prev.map(n =>
                n._id === finalNote._id ? finalNote : n
            ));
        } catch (err: any) {
            console.error('Failed to save note:', err);
            throw err;
        }
    }, [selectedNote, encryptNoteContent, deriveAesKey, encryptString, generateNoteHash, decryptedTitles]);

    // Handle folder operations
    const openFolderDialog = (mode: 'create' | 'rename', folder?: NoteFolder) => {
        setFolderDialogMode(mode);
        if (mode === 'rename' && folder) {
            setEditingFolderId(folder._id);
            setFolderDialogValue(folder.name);
        } else {
            setEditingFolderId(null);
            setFolderDialogValue('');
        }
        setFolderDialogOpen(true);
    };

    const handleFolderDialogConfirm = async () => {
        if (!folderDialogValue.trim()) return;

        try {
            if (folderDialogMode === 'create') {
                const newFolder = await noteService.createFolder({ name: folderDialogValue });
                setFolders(prev => [...prev, newFolder]);
            } else if (editingFolderId) {
                const updatedFolder = await noteService.updateFolder(editingFolderId, { name: folderDialogValue });
                setFolders(prev => prev.map(f => f._id === editingFolderId ? updatedFolder : f));
            }
            setFolderDialogOpen(false);
        } catch (err: any) {
            setError(err.message || 'Failed to process folder operation');
        }
    };

    const openDeleteConfirm = (mode: 'note' | 'folder', id: string, title: string) => {
        setDeleteConfirmMode(mode);
        setDeleteConfirmId(id);
        setDeleteConfirmTitle(title);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmId) return;

        try {
            if (deleteConfirmMode === 'folder') {
                await noteService.deleteFolder(deleteConfirmId);
                setFolders(prev => prev.filter(f => f._id !== deleteConfirmId));
                if (selectedFolderId === deleteConfirmId) setSelectedFolderId(null);
                loadData(); // Reload notes as they might have moved
            } else {
                await noteService.deleteNote(deleteConfirmId);
                setNotes(prev => prev.filter(n => n._id !== deleteConfirmId));
                if (selectedNote?.metadata._id === deleteConfirmId) {
                    setSelectedNote(null);
                    if (isMobile) setMobileEditorOpen(false);
                }
            }
            setDeleteConfirmOpen(false);
        } catch (err: any) {
            setError(err.message || `Failed to delete ${deleteConfirmMode}`);
        }
    };

    // Legacy handlers updated to use dialogs or kept for background logic
    const handleDeleteFolder = async (folderId: string) => {
        const folder = folders.find(f => f._id === folderId);
        openDeleteConfirm('folder', folderId, folder?.name || 'this folder');
    };

    // Delete note
    const handleDeleteNote = useCallback(async (noteId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const title = decryptedTitles[noteId] || 'this note';
        openDeleteConfirm('note', noteId, title);
    }, [decryptedTitles]);

    // Filter notes by search
    const filteredNotes = notes.filter(note => {
        const title = decryptedTitles[note._id] || '';
        const query = searchQuery.toLowerCase();

        if (!searchQuery) return true;

        const matchesTitle = title.toLowerCase().includes(query);
        const matchesTags = note.tags.some(tag => tag.toLowerCase().includes(query));

        return matchesTitle || matchesTags;
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

    const handleToggleFullView = () => {
        setFullViewOpen(prev => !prev);
    };

    // Drag & Drop handlers
    const handleNoteDragStart = (e: React.DragEvent, noteId: string) => {
        setDraggedNoteId(noteId);
        e.dataTransfer.setData('noteId', noteId);
        e.dataTransfer.effectAllowed = 'move';

        // Ensure ghost image looks okay
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleNoteDragEnd = (e: React.DragEvent) => {
        setDraggedNoteId(null);
        setDragOverFolderId(null);
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';
    };

    const handleFolderDragOver = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedNoteId) {
            setDragOverFolderId(folderId === null ? 'root' : folderId);
        }
    };

    const handleFolderDragLeave = () => {
        setDragOverFolderId(null);
    };

    const handleNoteDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        setDragOverFolderId(null);

        const noteId = e.dataTransfer.getData('noteId') || draggedNoteId;
        if (!noteId) return;

        // Don't move if target is same as current folder (best effort check)
        const note = notes.find(n => n._id === noteId);
        if (note && note.noteFolderId === (targetFolderId || undefined)) return;

        try {
            await noteService.updateNoteMetadata(noteId, {
                noteFolderId: targetFolderId || undefined
            });

            // Update local state
            setNotes(prev => prev.map(n =>
                n._id === noteId ? { ...n, noteFolderId: targetFolderId || undefined } : n
            ));

            // If the note was selected, update its metadata
            if (selectedNote?.metadata._id === noteId) {
                setSelectedNote(prev => prev ? {
                    ...prev,
                    metadata: { ...prev.metadata, noteFolderId: targetFolderId || undefined }
                } : null);
            }

            // If we are currently filtered by folder, we should remove it from view
            if (selectedFolderId !== null && targetFolderId !== selectedFolderId) {
                setNotes(prev => prev.filter(n => n._id !== noteId));
            }

        } catch (err: any) {
            setError(err.message || 'Failed to move note');
        } finally {
            setDraggedNoteId(null);
        }
    };

    // Folder List Component
    const FolderList = (
        <Box sx={{ py: 1 }}>
            <Box sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        gap: 0.5,
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
                    onClick={() => openFolderDialog('create')}
                    sx={{ color: 'primary.main' }}
                >
                    <CreateNewFolder fontSize="small" />
                </IconButton>
            </Box>

            <Collapse in={foldersExpanded}>
                <List disablePadding>
                    <ListItemButton
                        selected={selectedFolderId === null}
                        onClick={() => setSelectedFolderId(null)}
                        onDragOver={(e) => handleFolderDragOver(e, null)}
                        onDragLeave={handleFolderDragLeave}
                        onDrop={(e) => handleNoteDrop(e, null)}
                        sx={{
                            mx: 1,
                            borderRadius: '10px',
                            py: 0.5,
                            mb: 0.5,
                            transition: 'all 0.2s',
                            bgcolor: dragOverFolderId === 'root' ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
                            transform: dragOverFolderId === 'root' ? 'scale(1.02)' : 'scale(1)',
                            '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                        }}
                    >
                        <FolderOpen sx={{ fontSize: 20, mr: 1.5, color: selectedFolderId === null ? 'primary.main' : 'text.secondary' }} />
                        <ListItemText primary="All Notes" primaryTypographyProps={{ variant: 'body2', fontWeight: selectedFolderId === null ? 600 : 400 }} />
                    </ListItemButton>

                    {folders.map(folder => (
                        <ListItemButton
                            key={folder._id}
                            selected={selectedFolderId === folder._id}
                            onClick={() => setSelectedFolderId(folder._id)}
                            onDragOver={(e) => handleFolderDragOver(e, folder._id)}
                            onDragLeave={handleFolderDragLeave}
                            onDrop={(e) => handleNoteDrop(e, folder._id)}
                            sx={{
                                mx: 1,
                                borderRadius: '10px',
                                py: 0.5,
                                mb: 0.5,
                                transition: 'all 0.2s',
                                bgcolor: dragOverFolderId === folder._id ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
                                transform: dragOverFolderId === folder._id ? 'scale(1.02)' : 'scale(1)',
                                '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                            }}
                        >
                            <Folder sx={{ fontSize: 20, mr: 1.5, color: folder.color || (selectedFolderId === folder._id ? 'primary.main' : 'text.secondary') }} />
                            <ListItemText
                                primary={folder.name}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                    fontWeight: selectedFolderId === folder._id ? 600 : 400,
                                    noWrap: true
                                }}
                            />
                            <Box sx={{ display: 'flex', opacity: 0, '.MuiListItemButton-root:hover &': { opacity: 0.5 } }}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openFolderDialog('rename', folder);
                                    }}
                                >
                                    <EditIcon fontSize="inherit" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteFolder(folder._id);
                                    }}
                                >
                                    <Delete fontSize="inherit" />
                                </IconButton>
                            </Box>
                        </ListItemButton>
                    ))}
                </List>
            </Collapse>
        </Box>
    );

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

            {/* Folder Selection (Mobile) / Tag Filters */}
            <Box sx={{ px: 2, pb: 1.5 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search notes..."
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

            {/* Folders Section */}
            {FolderList}

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
                                ? 'No notes in this folder.'
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
                                        draggable
                                        onDragStart={(e) => handleNoteDragStart(e, note._id)}
                                        onDragEnd={handleNoteDragEnd}
                                        sx={{
                                            mx: 1,
                                            my: 0.5,
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
                                                    {decryptedTitles[note._id] || 'Decrypting...'}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                                                    <Typography variant="caption" color="text.disabled">
                                                        {new Date(note.updatedAt).toLocaleDateString()}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        {note.tags.slice(0, 1).map(tag => (
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
                                                onClick={(e) => handleDeleteNote(note._id, e)}
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
                        initialTitle={decryptedTitles[selectedNote.metadata._id] || ''}
                        initialContent={selectedNote.content as JSONContent}
                        onSave={handleSaveContent}
                        onToggleFullscreen={handleToggleFullView}
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
                    slotProps={{
                        paper: {
                            sx: {
                                width: '100%',
                                bgcolor: 'background.default',
                            },
                        }
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
                        <Typography
                            variant="h6"
                            noWrap
                            sx={{
                                fontWeight: 600,
                                flex: 1
                            }}
                        >
                            {selectedNote ? (decryptedTitles[selectedNote.metadata._id] || 'Note') : 'Note'}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                        onClick={() => setSidebarVisible(!sidebarVisible)}
                        sx={{ mr: 1, color: 'text.secondary' }}
                    >
                        {sidebarVisible ? <MenuOpenIcon /> : <MenuIcon />}
                    </IconButton>
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
                <AnimatePresence initial={false}>
                    {sidebarVisible && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden', display: 'flex' }}
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>

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

            {/* Folder Creation/Rename Dialog */}
            <Dialog
                open={folderDialogOpen}
                onClose={() => setFolderDialogOpen(false)}
                slotProps={{
                    paper: {
                        sx: { borderRadius: '16px', width: '100%', maxWidth: 400 }
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {folderDialogMode === 'create' ? 'Create New Folder' : 'Rename Folder'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        fullWidth
                        variant="outlined"
                        value={folderDialogValue}
                        onChange={(e) => setFolderDialogValue(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') handleFolderDialogConfirm();
                        }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setFolderDialogOpen(false)} sx={{ borderRadius: '8px' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleFolderDialogConfirm}
                        variant="contained"
                        disabled={!folderDialogValue.trim()}
                        sx={{ borderRadius: '8px' }}
                    >
                        {folderDialogMode === 'create' ? 'Create' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                slotProps={{
                    paper: {
                        sx: { borderRadius: '16px', width: '100%', maxWidth: 400 }
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
                    Delete {deleteConfirmMode === 'note' ? 'Note' : 'Folder'}?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>{deleteConfirmTitle}</strong>?
                        {deleteConfirmMode === 'folder' && (
                            <Box component="span" sx={{ display: 'block', mt: 1, fontSize: '0.875rem' }}>
                                All notes in this folder will be moved to "All Notes".
                            </Box>
                        )}
                        This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ borderRadius: '8px' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        sx={{ borderRadius: '8px' }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Note Full View Overlay */}
            {selectedNote && (
                <NoteFullView
                    open={fullViewOpen}
                    onClose={() => setFullViewOpen(false)}
                    note={selectedNote}
                    decryptedTitle={decryptedTitles[selectedNote.metadata._id] || ''}
                    onSave={handleSaveContent}
                />
            )}
        </Box>
    );
};

export default NotesPage;

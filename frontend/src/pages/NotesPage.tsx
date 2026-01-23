import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Box,
    useTheme,
    useMediaQuery,
    Drawer,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    TextField,
    Typography
} from '@mui/material';
import { AnimatePresence } from 'framer-motion';

import { useNotesData } from '../hooks/useNotesData';
import { useFolderDragDrop } from '../hooks/useFolderDragDrop';
import { useNotesSearch } from '../hooks/useNotesSearch';
import { NoteSidebar } from '../components/notes/NoteSidebar';
import { NoteDetailView } from '../components/notes/NoteDetailView';
import { NoteFullView } from '../components/notes/NoteFullView';
import { FolderPanel } from '../components/notes/FolderPanel';
import { NotesPanel } from '../components/notes/NotesPanel';
import { NotePreviewPanel } from '../components/notes/NotePreviewPanel';
import type { NoteFolder, NoteMetadata } from '../services/noteService';
import { NoteAlt, Add } from '@mui/icons-material';
import AegisEditor from '../components/notes/AegisEditor';
import type { JSONContent } from '@tiptap/react';

const NotesPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Data Hook
    const notesData = useNotesData();
    const {
        notes,
        folders,
        selectedFolderId,
        setSelectedFolderId,
        selectedNote,
        setSelectedNote,
        isLoading,
        isRefreshing,
        isLoadingContent,
        decryptedTitles,
        handleCreateNote,
        handleSelectNote,
        handleSaveContent,
        createFolder,
        updateFolder,
        deleteFolder,
        deleteNote,
        userTags,
        selectedTags,
        setSelectedTags,
        moveNote
    } = notesData;

    // Search Hook
    const { searchQuery, setSearchQuery, filteredNotes, isFiltering } = useNotesSearch(
        notes,
        decryptedTitles,
        selectedFolderId,
        selectedTags
    );

    // Drag & Drop Hook
    const dragDrop = useFolderDragDrop({
        notes,
        moveNote,
        decryptedTitles
    });

    // UI State
    const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

    // Dialog States
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename'>('create');
    const [folderDialogValue, setFolderDialogValue] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmMode, setDeleteConfirmMode] = useState<'note' | 'folder'>('note');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

    // Preview Panel State
    const [previewNote, setPreviewNote] = useState<NoteMetadata | null>(null);

    // Editor Portal State
    const [editorContainer, setEditorContainer] = useState<HTMLElement | null>(null);
    const [isZenMode, setIsZenMode] = useState(false);

    // Callback to capture the container ref from child components
    const handleEditorContainerRef = useCallback((node: HTMLElement | null) => {
        setEditorContainer(node);
    }, []);

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
    };

    // Handlers - Desktop: click opens NoteFullView
    const handleSelectNoteDesktop = useCallback(async (note: NoteMetadata) => {
        await handleSelectNote(note);
        // Note is now selected and will be shown in NoteFullView
    }, [handleSelectNote]);

    // Mobile: opens drawer
    const handleSelectNoteMobile = useCallback(async (note: NoteMetadata) => {
        await handleSelectNote(note);
        setMobileEditorOpen(true);
    }, [handleSelectNote]);

    // Create note - opens in full view on desktop, drawer on mobile
    const handleCreateNoteWrapper = useCallback(async () => {
        try {
            await handleCreateNote();
            if (isMobile) setMobileEditorOpen(true);
            // On desktop, selectedNote will trigger NoteFullView to open
        } catch (err) {
            // Error managed in hook
        }
    }, [handleCreateNote, isMobile]);

    // Close NoteFullView (desktop)
    const handleCloseNote = useCallback(() => {
        setSelectedNote(null);
        setIsZenMode(false); // Reset Zen mode
        setEditorContainer(null);
    }, [setSelectedNote]);

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
                await createFolder(folderDialogValue);
            } else if (editingFolderId) {
                await updateFolder(editingFolderId, folderDialogValue);
            }
            setFolderDialogOpen(false);
        } catch (err) {
            // Error managed in hook
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
                await deleteFolder(deleteConfirmId);
            } else {
                await deleteNote(deleteConfirmId);
                if (isMobile && selectedNote?.metadata._id === deleteConfirmId) {
                    setMobileEditorOpen(false);
                }
            }
            setDeleteConfirmOpen(false);
        } catch (err) {
            // Error managed in hook
        }
    };

    const handleToggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleDeleteNoteWrapper = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const title = decryptedTitles.get(id) || 'this note';
        openDeleteConfirm('note', id, title);
    };

    const editorElement = selectedNote ? (
        <AegisEditor
            key={selectedNote.metadata._id}
            initialContent={selectedNote.content as JSONContent}
            initialTitle={decryptedTitles.get(selectedNote.metadata._id) || (selectedNote.metadata.encryptedTitle ? 'Loading...' : 'Untitled Note')}
            onSave={handleSaveContent}
            autoSaveDelay={1000}
            fullscreen={true}
            compact={isZenMode}
            onToggleFullscreen={handleCloseNote}
        />
    ) : null;

    // Folder State
    const [foldersExpanded, setFoldersExpanded] = useState(true);

    // ============ MOBILE LAYOUT ============
    if (isMobile) {
        return (
            <React.Fragment>
                <Drawer
                    open={!mobileEditorOpen}
                    variant="permanent"
                    sx={{
                        width: '100%',
                        '& .MuiDrawer-paper': { width: '100%', border: 'none' },
                        display: mobileEditorOpen ? 'none' : 'block'
                    }}
                >
                    <NoteSidebar
                        notes={filteredNotes}
                        folders={folders}
                        selectedFolderId={selectedFolderId}
                        selectedNoteId={selectedNote?.metadata._id || null}
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        onCreateNote={handleCreateNoteWrapper}
                        onSelectFolder={setSelectedFolderId}
                        onSelectNote={handleSelectNoteMobile}
                        onDeleteNote={handleDeleteNoteWrapper}
                        userTags={userTags}
                        selectedTags={selectedTags}
                        onToggleTag={handleToggleTag}
                        foldersExpanded={foldersExpanded}
                        setFoldersExpanded={setFoldersExpanded}
                        onOpenFolderDialog={openFolderDialog}
                        onDeleteFolder={(id) => openDeleteConfirm('folder', id, folders.find(f => f._id === id)?.name || 'this folder')}
                        isRefreshing={isRefreshing}
                        isLoading={isLoading || isFiltering}
                        decryptedTitles={decryptedTitles}
                        dragDrop={dragDrop}
                    />
                </Drawer>

                <Drawer
                    anchor="right"
                    open={mobileEditorOpen}
                    onClose={() => setMobileEditorOpen(false)}
                    PaperProps={{ sx: { width: '100%', display: 'flex', flexDirection: 'column' } }}
                >
                    <NoteDetailView
                        selectedNote={selectedNote}
                        isLoadingContent={isLoadingContent}
                        onCreateNote={handleCreateNoteWrapper}
                        isMobile={true}
                        onMobileBack={() => setMobileEditorOpen(false)}
                        editorInstance={editorElement}
                    />
                </Drawer>

                {/* Folder Dialog */}
                <Dialog open={folderDialogOpen} onClose={() => setFolderDialogOpen(false)}>
                    <DialogTitle>{folderDialogMode === 'create' ? 'New Folder' : 'Rename Folder'}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Folder Name"
                            fullWidth
                            variant="outlined"
                            value={folderDialogValue}
                            onChange={(e) => setFolderDialogValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleFolderDialogConfirm();
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleFolderDialogConfirm} variant="contained">
                            {folderDialogMode === 'create' ? 'Create' : 'Save'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                    <DialogTitle>Delete {deleteConfirmMode === 'note' ? 'Note' : 'Folder'}?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete "{deleteConfirmTitle}"?
                            {deleteConfirmMode === 'folder' && ' All notes within this folder will strictly not be deleted.'}
                            This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </React.Fragment>
        );
    }

    // ============ DESKTOP LAYOUT ============
    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%', p: 3 }}>
                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        onClick={handleCreateNoteWrapper}
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

                {/* Two-Panel Layout */}
                <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 2 }}>
                    {/* Left Panel - Folders */}
                    <Box sx={{ width: 260, flexShrink: 0 }}>
                        <FolderPanel
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={setSelectedFolderId}
                            onOpenFolderDialog={openFolderDialog}
                            onDeleteFolder={(id) => openDeleteConfirm('folder', id, folders.find(f => f._id === id)?.name || 'this folder')}
                            dragDrop={dragDrop}
                        />
                    </Box>

                    {/* Middle Panel - Notes List */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <NotesPanel
                            notes={filteredNotes}
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            selectedNoteId={selectedNote?.metadata._id || null}
                            searchQuery={searchQuery}
                            onSearchChange={handleSearchChange}
                            onSelectNote={handleSelectNoteDesktop}
                            onDeleteNote={handleDeleteNoteWrapper}
                            userTags={userTags}
                            selectedTags={selectedTags}
                            onToggleTag={handleToggleTag}
                            isLoading={isLoading || isFiltering}
                            decryptedTitles={decryptedTitles}
                            dragDrop={dragDrop}
                            onPreviewChange={setPreviewNote}
                        />
                    </Box>

                    {/* Right Panel - Preview (Desktop Only) */}
                    {!isMobile && (
                        <Box sx={{ width: 280, flexShrink: 0 }}>
                            <NotePreviewPanel
                                previewNote={previewNote}
                                decryptedTitles={decryptedTitles}
                            />
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Folder Dialog */}
            <Dialog open={folderDialogOpen} onClose={() => setFolderDialogOpen(false)}>
                <DialogTitle>{folderDialogMode === 'create' ? 'New Folder' : 'Rename Folder'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        fullWidth
                        variant="outlined"
                        value={folderDialogValue}
                        onChange={(e) => setFolderDialogValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFolderDialogConfirm();
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleFolderDialogConfirm} variant="contained">
                        {folderDialogMode === 'create' ? 'Create' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Delete {deleteConfirmMode === 'note' ? 'Note' : 'Folder'}?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete "{deleteConfirmTitle}"?
                        {deleteConfirmMode === 'folder' && ' All notes within this folder will strictly not be deleted.'}
                        This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* NoteFullView - Opens when a note is selected */}
            <AnimatePresence>
                {selectedNote && (
                    <NoteFullView
                        open={true}
                        note={selectedNote}
                        decryptedTitle={decryptedTitles.get(selectedNote.metadata._id) || 'Untitled Note'}
                        onClose={handleCloseNote}
                        containerRef={handleEditorContainerRef}
                        isZenMode={isZenMode}
                        onToggleZenMode={() => setIsZenMode(prev => !prev)}
                    />
                )}
            </AnimatePresence>

            {/* Single Editor Instance using Portal */}
            {selectedNote && editorContainer && createPortal(
                editorElement,
                editorContainer
            )}
        </React.Fragment>
    );
};

export default NotesPage;

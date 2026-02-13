import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
    Box,
    useTheme,
    useMediaQuery,
    Drawer,
    Button,
    Typography,
    Snackbar,
    Alert
} from '@mui/material';
import { NoteAlt, Add } from '@mui/icons-material';

import { useNotesData } from '../hooks/useNotesData';
import { useFolderDragDrop } from '../hooks/useFolderDragDrop';
import { useNotesSearch } from '../hooks/useNotesSearch';
import { NoteSidebar } from '../components/notes/NoteSidebar';
import { NoteDetailView } from '../components/notes/NoteDetailView';
import { NoteFullView } from '../components/notes/NoteFullView';
import { FolderPanel } from '../components/notes/FolderPanel';
import { NotesPanel } from '../components/notes/NotesPanel';
import { NotePreviewPanel } from '../components/notes/NotePreviewPanel';
import { FolderDialog } from '../components/notes/FolderDialog';
import { DeleteConfirmDialog } from '../components/notes/DeleteConfirmDialog';
import AegisEditor from '../components/notes/AegisEditor';

import type { NoteFolder, NoteMetadata } from '../services/noteService';
import type { JSONContent } from '@tiptap/react';

const NotesPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Data Hook (Orchestrator)
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
        moveNote,
        loadMore,
        hasMore,
        isFetchingMore
    } = notesData;

    // Search Hook
    const { searchQuery, setSearchQuery, filteredNotes, isFiltering } = useNotesSearch(
        notes,
        decryptedTitles,
        selectedFolderId,
        selectedTags
    );

    // UI State
    const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
    const [foldersExpanded, setFoldersExpanded] = useState(true);
    const [isZenMode, setIsZenMode] = useState(false);
    const [editorContainer, setEditorContainer] = useState<HTMLElement | null>(null);
    const [previewNote, setPreviewNote] = useState<NoteMetadata | null>(null);

    // Dialog States
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename'>('create');
    const [folderDialogValue, setFolderDialogValue] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmMode, setDeleteConfirmMode] = useState<'note' | 'folder'>('note');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

    const [errorSnackbarOpen, setErrorSnackbarOpen] = useState(false);
    const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Sync error from hook to snackbar
    useEffect(() => {
        const timer = setTimeout(() => {
            setErrorSnackbarOpen(notesData.error ? true : false);
        }, 0);
        return () => clearTimeout(timer);
    }, [notesData.error]);

    const handleCloseError = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setErrorSnackbarOpen(false);
    };

    const handleCloseSuccess = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSuccessSnackbarOpen(false);
    };

    const handleMoveNoteConfirmation = useCallback(async (noteId: string, folderId: string | null) => {
        try {
            await moveNote(noteId, folderId);
            const folderName = folderId ? (folders.find(f => f._id === folderId)?.name || 'folder') : 'All Notes';
            const noteTitle = decryptedTitles.get(noteId) || 'Note';
            setSuccessMessage(`Moved "${noteTitle}" to ${folderName}`);
            setSuccessSnackbarOpen(true);
        } catch (err) {
            console.error('Failed to move note:', err);
        }
    }, [moveNote, folders, decryptedTitles]);

    // Drag & Drop Hook
    const dragDrop = useFolderDragDrop({
        notes,
        moveNote: handleMoveNoteConfirmation,
        decryptedTitles
    });

    const handleEditorContainerRef = useCallback((node: HTMLElement | null) => {
        setEditorContainer(node);
    }, []);

    const [searchParams, setSearchParams] = useSearchParams();

    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
    }, [setSearchQuery]);

    const updateUrlParams = useCallback((noteId: string | null, folderId?: string | null) => {
        const params = new URLSearchParams(searchParams);
        if (noteId) {
            params.set('n', noteId);
        } else {
            params.delete('n');
        }

        if (folderId !== undefined) {
            if (folderId) {
                params.set('f', folderId);
            } else {
                params.delete('f');
            }
        }
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    // Sync state FROM URL
    useEffect(() => {
        const urlNoteId = searchParams.get('n');
        const urlFolderId = searchParams.get('f');

        // Sync Folder Only if it actually changed to avoid cycles
        if (urlFolderId !== selectedFolderId) {
            setSelectedFolderId(urlFolderId);
        }

        // Sync Note
        if (urlNoteId) {
            if (selectedNote?.metadata._id !== urlNoteId) {
                // Find note in list to select
                const noteToSelect = notes.find(n => n._id === urlNoteId);
                // Only select if not already loading content for this specific note
                if (noteToSelect) {
                    handleSelectNote(noteToSelect);
                }
            }

            // Always ensure mobile editor is open if we have a note URL
            if (isMobile) {
                // Use setTimeout to defer state update
                const timer = setTimeout(() => setMobileEditorOpen(true), 0);
                return () => clearTimeout(timer);
            }
        } else if (selectedNote) {
            // Close note if it was open but no 'n' in URL
            const timer = setTimeout(() => {
                setSelectedNote(null);
                setIsZenMode(false);
                setEditorContainer(null);
                if (isMobile) {
                    setMobileEditorOpen(false);
                }
            }, 0);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedFolderId is intentionally excluded to prevent sync loops
    }, [searchParams, notes, isMobile, handleSelectNote, setSelectedFolderId, setSelectedNote]);

    const handleSelectNoteDesktop = useCallback(async (note: NoteMetadata) => {
        updateUrlParams(note._id);
    }, [updateUrlParams]);

    const handleSelectNoteMobile = useCallback(async (note: NoteMetadata) => {
        updateUrlParams(note._id);
    }, [updateUrlParams]);

    const handleCreateNoteWrapper = useCallback(async () => {
        try {
            const newNote = await handleCreateNote();
            if (newNote) {
                updateUrlParams(newNote._id);
            }
        } catch (err) {
            console.error('Failed to create note:', err);
        }
    }, [handleCreateNote, updateUrlParams]);

    const handleCloseNote = useCallback(() => {
        updateUrlParams(null);
    }, [updateUrlParams]);

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

    const handleFolderConfirm = async (name: string) => {
        try {
            if (folderDialogMode === 'create') {
                await createFolder(name);
            } else if (editingFolderId) {
                await updateFolder(editingFolderId, name);
            }
            setFolderDialogOpen(false);
        } catch (err) {
            console.error('Failed to confirm folder:', err);
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
            console.error('Failed to delete item:', err);
        }
    };

    const handleToggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
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

    return (
        <React.Fragment>
            {isMobile ? (
                <Box sx={{ height: '100%', position: 'relative' }}>
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            // Keep sidebar in layout to avoid focus restoration issues
                            // but hidden from view when editor is open
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
                            onSelectFolder={(id) => updateUrlParams(null, id)}
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
                    </Box>

                    <Drawer
                        anchor="right"
                        open={mobileEditorOpen}
                        onClose={handleCloseNote}
                        slotProps={{
                            paper: {
                                sx: {
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: 'none'
                                }
                            }
                        }}
                        transitionDuration={250}
                    >
                        <NoteDetailView
                            selectedNote={selectedNote}
                            isLoadingContent={isLoadingContent}
                            onCreateNote={handleCreateNoteWrapper}
                            isMobile={true}
                            onMobileBack={handleCloseNote}
                            editorInstance={editorElement}
                            isZenMode={isZenMode}
                            onToggleZenMode={() => setIsZenMode(prev => !prev)}
                        />
                    </Drawer>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%', p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                            onClick={handleCreateNoteWrapper}
                            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 3 }}
                        >
                            New Note
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 2 }}>
                        <Box sx={{ width: 260, flexShrink: 0 }}>
                            <FolderPanel
                                folders={folders}
                                selectedFolderId={selectedFolderId}
                                onSelectFolder={(id) => updateUrlParams(null, id)}
                                onOpenFolderDialog={openFolderDialog}
                                onDeleteFolder={(id) => openDeleteConfirm('folder', id, folders.find(f => f._id === id)?.name || 'this folder')}
                                dragDrop={dragDrop}
                            />
                        </Box>

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
                                isRefreshing={isRefreshing}
                                decryptedTitles={decryptedTitles}
                                dragDrop={dragDrop}
                                onPreviewChange={setPreviewNote}
                                onLoadMore={loadMore}
                                hasMore={hasMore}
                                isFetchingMore={isFetchingMore}
                            />
                        </Box>

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
            )}

            {/* Desktop Full View Portals */}
            {!isMobile && (
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
            )}

            {!isMobile && selectedNote && editorContainer && createPortal(
                editorElement,
                editorContainer
            )}

            <FolderDialog
                open={folderDialogOpen}
                onClose={() => setFolderDialogOpen(false)}
                mode={folderDialogMode}
                initialValue={folderDialogValue}
                onConfirm={handleFolderConfirm}
            />

            <DeleteConfirmDialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                mode={deleteConfirmMode}
                title={deleteConfirmTitle}
                onConfirm={handleDeleteConfirm}
            />

            <Snackbar
                open={errorSnackbarOpen}
                autoHideDuration={6000}
                onClose={handleCloseError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseError} severity="error" variant="filled" sx={{ width: '100%' }}>
                    {notesData.error}
                </Alert>
            </Snackbar>

            <Snackbar
                open={successSnackbarOpen}
                autoHideDuration={3000}
                onClose={handleCloseSuccess}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSuccess} severity="success" variant="filled" sx={{ width: '100%' }}>
                    {successMessage}
                </Alert>
            </Snackbar>
        </React.Fragment>
    );
};

export default NotesPage;

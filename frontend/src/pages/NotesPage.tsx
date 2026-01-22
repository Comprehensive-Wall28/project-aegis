import React, { useState } from 'react';
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
import { AnimatePresence, motion } from 'framer-motion';

import { useNotesData } from '../hooks/useNotesData';
import { useFolderDragDrop } from '../hooks/useFolderDragDrop';
import { useNotesSearch } from '../hooks/useNotesSearch';
import { NoteSidebar } from '../components/notes/NoteSidebar';
import { NoteDetailView } from '../components/notes/NoteDetailView';
import { NoteFullView } from '../components/notes/NoteFullView';
import type { NoteFolder } from '../services/noteService';
import { NoteAlt, Menu as MenuIcon, MenuOpen as MenuOpenIcon, Add } from '@mui/icons-material';

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
        // setSelectedNote - removed unused
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
        moveNote
    });

    // UI State
    const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
    const [fullViewOpen, setFullViewOpen] = useState(false);
    const [foldersExpanded, setFoldersExpanded] = useState(true);

    // Dialog States
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename'>('create');
    const [folderDialogValue, setFolderDialogValue] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmMode, setDeleteConfirmMode] = useState<'note' | 'folder'>('note');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

    const [sidebarVisible, setSidebarVisible] = useState(true);

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        if (query.trim().length > 0) {
            setFoldersExpanded(false);
        } else {
            // Optional: expand back if cleared? Maybe not.
            // setFoldersExpanded(true); 
        }
    };

    // Handlers
    const handleSelectNoteWrapper = (note: any) => {
        handleSelectNote(note);
        if (isMobile) setMobileEditorOpen(true);
    };

    const handleCreateNoteWrapper = async () => {
        try {
            await handleCreateNote();
            if (isMobile) setMobileEditorOpen(true);
        } catch (err) {
            // Error managed in hook
        }
    };

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
        const title = decryptedTitles[id] || 'this note';
        openDeleteConfirm('note', id, title);
    };

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
                        onSelectNote={handleSelectNoteWrapper}
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
                    PaperProps={{ sx: { width: '100%' } }}
                >
                    <NoteDetailView
                        selectedNote={selectedNote}
                        decryptedTitle={selectedNote ? decryptedTitles[selectedNote.metadata._id] : undefined}
                        isLoadingContent={isLoadingContent}
                        onSaveContent={handleSaveContent}
                        onCreateNote={handleCreateNoteWrapper}
                        isMobile={true}
                        onMobileBack={() => setMobileEditorOpen(false)}
                        onToggleFullscreen={() => setFullViewOpen(true)}
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
                        {/* 
                         We need icons for MenuOpen/Menu logic. 
                         Import MenuOpen, MenuIcon from @mui/icons-material. 
                         Add them to imports first! 
                         For now assuming we will fix imports in next step or use what's available. 
                         NotesPage imports might be missing these specific icons.
                     */}
                        <Button
                            onClick={() => setSidebarVisible(!sidebarVisible)}
                            sx={{ minWidth: 40, width: 40, height: 40, borderRadius: '50%', color: 'text.secondary', mr: 1, p: 0 }}
                        >
                            {sidebarVisible ? <MenuOpenIcon /> : <MenuIcon />}
                        </Button>
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
                                {/* NoteAlt is imported */}
                                {/* <NoteAlt sx={{ fontSize: 32, color: 'primary.main' }} /> */}
                                {/* Reusing existing imports */}
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

                <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 2 }}>
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
                                <Box sx={{
                                    width: 320,
                                    flexShrink: 0,
                                    border: 1,
                                    borderColor: theme.palette.divider,
                                    borderRadius: '16px',
                                    bgcolor: 'background.paper',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <NoteSidebar
                                        notes={filteredNotes}
                                        folders={folders}
                                        selectedFolderId={selectedFolderId}
                                        selectedNoteId={selectedNote?.metadata._id || null}
                                        searchQuery={searchQuery}
                                        onSearchChange={handleSearchChange}
                                        onCreateNote={handleCreateNoteWrapper}
                                        onSelectFolder={setSelectedFolderId}
                                        onSelectNote={handleSelectNoteWrapper}
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
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Content */}
                    <Box sx={{
                        flex: 1,
                        height: '100%',
                        position: 'relative',
                        border: 1,
                        borderColor: theme.palette.divider,
                        borderRadius: '16px',
                        overflow: 'hidden'
                    }}>
                        <NoteDetailView
                            selectedNote={selectedNote}
                            decryptedTitle={selectedNote ? decryptedTitles[selectedNote.metadata._id] : undefined}
                            isLoadingContent={isLoadingContent}
                            onSaveContent={handleSaveContent}
                            onCreateNote={handleCreateNoteWrapper}
                            isMobile={false}
                            onMobileBack={() => { }}
                            onToggleFullscreen={() => setFullViewOpen(true)}
                        />
                    </Box>
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

            {/* Full View Modal */}
            <AnimatePresence>
                {fullViewOpen && selectedNote && (
                    <NoteFullView
                        open={true}
                        note={selectedNote}
                        decryptedTitle={decryptedTitles[selectedNote.metadata._id] || 'Untitled Note'}
                        onClose={() => setFullViewOpen(false)}
                        onSave={handleSaveContent}
                    />
                )}
            </AnimatePresence>
        </React.Fragment>
    );
};

export default NotesPage;

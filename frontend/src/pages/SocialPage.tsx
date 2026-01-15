import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Avatar,
    TextField,
    Button,
    alpha,
    useTheme,
    CircularProgress,
    Snackbar,
    Alert,
    Tooltip,
    InputAdornment,
    Divider,
    Menu,
    MenuItem,
    useMediaQuery,
    Drawer,
    Fab,
} from '@mui/material';
import {
    Add as AddIcon,
    Link as LinkIcon,
    ContentCopy as CopyIcon,
    Group as GroupIcon,
    Folder as CollectionIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    Menu as MenuIcon,
    Share as ShareIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '@/stores/useSocialStore';
import { useSessionStore } from '@/stores/sessionStore';
import { LinkCard } from '@/components/social/LinkCard';
import type { Room } from '@/services/socialService';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
};

// Create Room Dialog (inline for simplicity)
function CreateRoomDialog({
    open,
    onClose,
    onSubmit,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string) => void;
    isLoading: boolean;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim(), description.trim());
        }
    };

    if (!open) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 1300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <Paper
                variant="solid"
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: '20px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Create New Room
                </Typography>

                <TextField
                    fullWidth
                    label="Room Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ mb: 2 }}
                    autoFocus
                />

                <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={2}
                    sx={{ mb: 3 }}
                />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!name.trim() || isLoading}
                    >
                        {isLoading ? <CircularProgress size={20} /> : 'Create'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

// Create Collection Dialog
function CreateCollectionDialog({
    open,
    onClose,
    onSubmit,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
    isLoading: boolean;
}) {
    const [name, setName] = useState('');

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim());
            setName('');
        }
    };

    useEffect(() => {
        if (!open) setName('');
    }, [open]);

    if (!open) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 1300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <Paper
                variant="solid"
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: '20px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    New Collection
                </Typography>

                <TextField
                    fullWidth
                    label="Collection Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ mb: 3 }}
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!name.trim() || isLoading}
                    >
                        {isLoading ? <CircularProgress size={20} /> : 'Create'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

// Post Link Dialog
function PostLinkDialog({
    open,
    onClose,
    onSubmit,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (url: string) => void;
    isLoading: boolean;
}) {
    const [url, setUrl] = useState('');

    const handleSubmit = () => {
        if (url.trim()) {
            onSubmit(url.trim());
            setUrl('');
        }
    };

    if (!open) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 1300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <Paper
                variant="solid"
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: '20px',
                    m: 2,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Post a Link
                </Typography>

                <TextField
                    fullWidth
                    label="URL"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    sx={{ mb: 3 }}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LinkIcon color="action" />
                            </InputAdornment>
                        ),
                    }}
                />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!url.trim() || isLoading}
                    >
                        {isLoading ? <CircularProgress size={20} /> : 'Post'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export function SocialPage() {
    const theme = useTheme();
    const { roomId } = useParams<{ roomId?: string }>();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    // Store state
    const rooms = useSocialStore((state) => state.rooms);
    const currentRoom = useSocialStore((state) => state.currentRoom);
    const collections = useSocialStore((state) => state.collections);
    const currentCollectionId = useSocialStore((state) => state.currentCollectionId);
    const links = useSocialStore((state) => state.links);
    const isLoadingContent = useSocialStore((state) => state.isLoadingContent);
    const isLoadingRooms = useSocialStore((state) => state.isLoadingRooms);

    // Actions

    const fetchRooms = useSocialStore((state) => state.fetchRooms);
    const selectRoom = useSocialStore((state) => state.selectRoom);
    const refreshCurrentRoom = useSocialStore((state) => state.refreshCurrentRoom);
    const selectCollection = useSocialStore((state) => state.selectCollection);
    const createRoom = useSocialStore((state) => state.createRoom);
    const postLink = useSocialStore((state) => state.postLink);
    const deleteLink = useSocialStore((state) => state.deleteLink);
    const createCollection = useSocialStore((state) => state.createCollection);
    const moveLink = useSocialStore((state) => state.moveLink);
    const createInvite = useSocialStore((state) => state.createInvite);
    const decryptRoomMetadata = useSocialStore((state) => state.decryptRoomMetadata);
    const decryptCollectionMetadata = useSocialStore((state) => state.decryptCollectionMetadata);

    // Get current user ID for delete permissions
    const currentUserId = useSessionStore((state) => state.user?._id);

    // Local state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showCollectionDialog, setShowCollectionDialog] = useState(false);
    const [showPostLinkDialog, setShowPostLinkDialog] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingCollection, setIsCreatingCollection] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [isPostingLink, setIsPostingLink] = useState(false);
    const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [decryptedNames, setDecryptedNames] = useState<Map<string, string>>(new Map());
    const [decryptedCollections, setDecryptedCollections] = useState<Map<string, string>>(new Map());
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedUploader, setSelectedUploader] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Mobile Responsive State
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    // Fetch rooms on mount
    useEffect(() => {
        if (pqcEngineStatus === 'operational') {
            fetchRooms();
        }
    }, [pqcEngineStatus, fetchRooms]);

    // Load room if roomId in URL
    useEffect(() => {
        if (roomId && pqcEngineStatus === 'operational') {
            selectRoom(roomId);
        }
    }, [roomId, pqcEngineStatus, selectRoom]);

    // Auto-select first room if none selected
    useEffect(() => {
        if (!roomId && rooms.length > 0 && !currentRoom && !isLoadingRooms) {
            selectRoom(rooms[0]._id);
        }
    }, [roomId, rooms, currentRoom, isLoadingRooms, selectRoom]);

    // Auto-refresh content every 5 seconds
    useEffect(() => {
        if (!currentRoom) return;

        const interval = setInterval(() => {
            refreshCurrentRoom();
        }, 5000);

        return () => clearInterval(interval);
    }, [currentRoom, refreshCurrentRoom]);

    // Decrypt room names when rooms change
    useEffect(() => {
        const decryptNames = async () => {
            const newDecryptedNames = new Map<string, string>();
            for (const room of rooms) {
                try {
                    const { name } = await decryptRoomMetadata(room);
                    newDecryptedNames.set(room._id, name);
                } catch {
                    newDecryptedNames.set(room._id, room.name.substring(0, 2));
                }
            }
            setDecryptedNames(newDecryptedNames);
        };

        if (rooms.length > 0) {
            decryptNames();
        }
    }, [rooms, decryptRoomMetadata]);

    // Decrypt collection names when they change
    useEffect(() => {
        const decryptNames = async () => {
            const newDecrypted = new Map<string, string>();
            for (const col of collections) {
                try {
                    const { name } = await decryptCollectionMetadata(col);
                    newDecrypted.set(col._id, name);
                } catch {
                    newDecrypted.set(col._id, 'Encrypted Collection');
                }
            }
            setDecryptedCollections(newDecrypted);
        };

        if (collections.length > 0) {
            decryptNames();
        }
    }, [collections, decryptCollectionMetadata]);

    const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCreateRoom = async (name: string, description: string) => {
        try {
            setIsCreating(true);
            const room = await createRoom(name, description);
            setShowCreateDialog(false);
            showSnackbar('Room created with end-to-end encryption', 'success');
            // Navigate to new room
            selectRoom(room._id);
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to create room', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handlePostLink = async (url?: string) => {
        const linkToPost = url || newLinkUrl;
        if (!linkToPost.trim()) return;

        try {
            setIsPostingLink(true);
            await postLink(linkToPost.trim());
            setNewLinkUrl('');
            setShowPostLinkDialog(false);
            showSnackbar('Link shared successfully', 'success');
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || 'Failed to post link';
            showSnackbar(message, 'error');
        } finally {
            setIsPostingLink(false);
        }
    };

    const handleCreateCollection = async (name: string) => {
        if (!name.trim() || isCreatingCollection) return;

        setIsCreatingCollection(true);
        try {
            await createCollection(name.trim());
            setShowCollectionDialog(false);
            showSnackbar('Collection created successfully', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to create collection', 'error');
        } finally {
            setIsCreatingCollection(false);
        }
    };

    const handleDrop = async (collectionId: string) => {
        if (!draggedLinkId) return;

        const linkToMove = links.find(l => l._id === draggedLinkId);
        if (linkToMove && linkToMove.collectionId !== collectionId) {
            try {
                await moveLink(draggedLinkId, collectionId);
                showSnackbar('Link moved successfully', 'success');
            } catch (error: any) {
                showSnackbar(error.message || 'Failed to move link', 'error');
            }
        }

        setDraggedLinkId(null);
        setDropTargetId(null);
    };

    const handleCopyInvite = async () => {
        if (!currentRoom) return;

        try {
            const inviteUrl = await createInvite(currentRoom._id);
            await navigator.clipboard.writeText(inviteUrl);
            showSnackbar('Invite link copied to clipboard', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to create invite', 'error');
        }
    };

    const getUniqueUploaders = useCallback(() => {
        const uploaders = new Map<string, string>(); // id -> username
        links.forEach(link => {
            if (typeof link.userId === 'object') {
                uploaders.set(link.userId._id, link.userId.username);
            }
        });
        return Array.from(uploaders.entries()).map(([id, username]) => ({ id, username }));
    }, [links]);

    const getFilteredLinks = useCallback(() => {
        let filtered = links;

        if (currentCollectionId) {
            filtered = filtered.filter((l) => l.collectionId === currentCollectionId);
        }

        if (selectedUploader) {
            filtered = filtered.filter((l) =>
                typeof l.userId === 'object' && l.userId._id === selectedUploader
            );
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((l) => {
                const title = (l.previewData?.title || '').toLowerCase();
                const url = l.url.toLowerCase();
                const username = typeof l.userId === 'object' ? l.userId.username.toLowerCase() : '';
                return title.includes(query) || url.includes(query) || username.includes(query);
            });
        }

        return filtered;
    }, [links, currentCollectionId, selectedUploader, searchQuery]);

    const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchorEl(null);
    };

    const handleSelectUploader = (uploaderId: string | null) => {
        setSelectedUploader(uploaderId);
        handleFilterClose();
    };

    const getRoomInitials = (room: Room): string => {
        const name = decryptedNames.get(room._id) || '??';
        return name.substring(0, 2).toUpperCase();
    };

    const SidebarContent = (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Left Sidebar - Room Icons */}
            <Paper
                variant="glass"
                sx={{
                    width: 72,
                    flexShrink: 0,
                    borderRadius: isMobile ? 0 : '16px',
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                    overflowY: 'auto',
                    height: '100%',
                    borderRight: isMobile ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
                }}
            >
                {rooms.map((room) => (
                    <Tooltip key={room._id} title={decryptedNames.get(room._id) || 'Room'} placement="right">
                        <Avatar
                            component={motion.div}
                            sx={{
                                width: 48,
                                height: 48,
                                bgcolor:
                                    currentRoom?._id === room._id
                                        ? 'primary.main'
                                        : alpha(theme.palette.primary.main, 0.2),
                                color:
                                    currentRoom?._id === room._id
                                        ? 'primary.contrastText'
                                        : 'primary.main',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '1rem',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: currentRoom?._id === room._id
                                        ? 'primary.main'
                                        : alpha(theme.palette.primary.main, 0.3),
                                }
                            }}
                            onClick={() => {
                                selectRoom(room._id);
                                if (isMobile) setMobileDrawerOpen(false);
                            }}
                        >
                            {getRoomInitials(room)}
                        </Avatar>
                    </Tooltip>
                ))}

                <Divider sx={{ width: '100%', my: 1 }} />

                {/* Create Room Button */}
                <Tooltip title="Create Room" placement="right">
                    <IconButton
                        onClick={() => {
                            setShowCreateDialog(true);
                        }}
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: alpha(theme.palette.success.main, 0.15),
                            color: 'success.main',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.success.main, 0.25),
                            },
                        }}
                    >
                        <AddIcon />
                    </IconButton>
                </Tooltip>
            </Paper>

            {/* Inner Sidebar - Collections */}
            {currentRoom && (
                <Paper
                    variant="glass"
                    sx={{
                        width: 180,
                        flexShrink: 0,
                        borderRadius: isMobile ? 0 : '16px',
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        overflowY: 'auto',
                        height: '100%',
                        ml: isMobile ? 0 : 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Collections
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setShowCollectionDialog(true)}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main' }
                            }}
                        >
                            <AddIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>

                    <AnimatePresence mode="wait">
                        {collections.map((collection) => (
                            <Box
                                key={collection._id}
                                component={motion.div}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onClick={() => {
                                    selectCollection(collection._id);
                                    if (isMobile) setMobileDrawerOpen(false);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDropTargetId(collection._id);
                                }}
                                onDragLeave={() => setDropTargetId(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    handleDrop(collection._id);
                                }}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'all 0.2s ease',
                                    bgcolor:
                                        currentCollectionId === collection._id
                                            ? alpha(theme.palette.primary.main, 0.15)
                                            : dropTargetId === collection._id
                                                ? alpha(theme.palette.primary.main, 0.25)
                                                : 'transparent',
                                    border: dropTargetId === collection._id
                                        ? `1px dashed ${theme.palette.primary.main}`
                                        : '1px solid transparent',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    },
                                }}
                            >
                                <CollectionIcon
                                    sx={{
                                        fontSize: 18,
                                        color:
                                            currentCollectionId === collection._id
                                                ? 'primary.main'
                                                : 'text.secondary',
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: currentCollectionId === collection._id ? 600 : 400,
                                        color:
                                            currentCollectionId === collection._id
                                                ? 'primary.main'
                                                : 'text.primary',
                                    }}
                                >
                                    {decryptedCollections.get(collection._id) || (collection.type === 'links' ? 'Links' : 'Collection')}
                                </Typography>
                            </Box>
                        ))}
                    </AnimatePresence>
                </Paper>
            )}
        </Box>
    );

    // Loading state
    if (pqcEngineStatus !== 'operational') {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 400,
                    gap: 2,
                }}
            >
                <CircularProgress />
                <Typography color="text.secondary">Initializing PQC Engine...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100%', gap: isMobile ? 0 : 2, overflow: 'hidden', position: 'relative' }}>
            {/* Desktop Sidebars */}
            {!isMobile && SidebarContent}

            {/* Mobile Drawer */}
            <Drawer
                anchor="left"
                open={mobileDrawerOpen}
                onClose={() => setMobileDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: 'background.default',
                        backgroundImage: 'none',
                        width: 'auto',
                    }
                }}
            >
                {SidebarContent}
            </Drawer>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, overflow: 'hidden' }}>
                {/* Unified Header for Mobile Accessibility */}
                {(isMobile || currentRoom) && (
                    <Paper
                        variant="glass"
                        sx={{
                            p: 2,
                            borderRadius: isMobile ? '12px' : '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {isMobile && (
                                <IconButton onClick={() => setMobileDrawerOpen(true)} edge="start" sx={{ mr: -1 }}>
                                    <MenuIcon />
                                </IconButton>
                            )}
                            {!isMobile && <GroupIcon sx={{ color: 'primary.main' }} />}
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {currentRoom ? (decryptedNames.get(currentRoom._id) || 'Loading...') : 'Social Rooms'}
                                </Typography>
                                {currentRoom && (
                                    <Typography variant="caption" color="text.secondary">
                                        {currentRoom.memberCount || 1} member{(currentRoom.memberCount || 1) > 1 ? 's' : ''}
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {currentRoom && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' }}>
                                {/* Search Bar */}
                                <AnimatePresence mode="wait">
                                    {isSearchOpen ? (
                                        <Box
                                            component={motion.div}
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: 200, opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            key="search-input"
                                            sx={{ overflow: 'hidden' }}
                                        >
                                            <TextField
                                                autoFocus
                                                placeholder="Search links..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                size="small"
                                                fullWidth
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <SearchIcon fontSize="small" color="action" />
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setSearchQuery('');
                                                                    setIsSearchOpen(false);
                                                                }}
                                                            >
                                                                <CloseIcon fontSize="small" />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: '20px',
                                                        bgcolor: alpha(theme.palette.background.paper, 0.5),
                                                    }
                                                }}
                                            />
                                        </Box>
                                    ) : (
                                        <Tooltip title="Search" key="search-icon">
                                            <IconButton onClick={() => setIsSearchOpen(true)}>
                                                <SearchIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </AnimatePresence>

                                {/* Filter Button */}
                                <Tooltip title="Filter by Uploader">
                                    <IconButton
                                        onClick={handleFilterClick}
                                        sx={{
                                            color: selectedUploader ? 'primary.main' : 'text.secondary',
                                            bgcolor: selectedUploader ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                            '&:hover': {
                                                color: 'primary.main',
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            }
                                        }}
                                    >
                                        <FilterListIcon />
                                    </IconButton>
                                </Tooltip>

                                {/* Mobile Invite Button */}
                                {isMobile && (
                                    <Tooltip title="Copy Invite Link">
                                        <IconButton onClick={handleCopyInvite} color="primary">
                                            <ShareIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                <Menu
                                    anchorEl={filterAnchorEl}
                                    open={Boolean(filterAnchorEl)}
                                    onClose={handleFilterClose}
                                    PaperProps={{
                                        variant: 'glass',
                                        sx: { minWidth: 200, mt: 1 }
                                    }}
                                >
                                    <MenuItem
                                        onClick={() => handleSelectUploader(null)}
                                        selected={selectedUploader === null}
                                    >
                                        All Uploaders
                                    </MenuItem>
                                    {getUniqueUploaders().map((uploader) => (
                                        <MenuItem
                                            key={uploader.id}
                                            onClick={() => handleSelectUploader(uploader.id)}
                                            selected={selectedUploader === uploader.id}
                                        >
                                            {uploader.username}
                                        </MenuItem>
                                    ))}
                                </Menu>

                                {/* Desktop Link Input */}
                                {!isMobile && (
                                    <>
                                        <TextField
                                            placeholder="Paste a link to share..."
                                            value={newLinkUrl}
                                            onChange={(e) => setNewLinkUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePostLink()}
                                            size="small"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LinkIcon color="action" sx={{ fontSize: 18 }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                flex: 1,
                                                maxWidth: 400,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '10px',
                                                },
                                            }}
                                        />

                                        <Button
                                            variant="contained"
                                            onClick={() => handlePostLink()}
                                            disabled={!newLinkUrl.trim() || isPostingLink}
                                            sx={{ borderRadius: '10px', flexShrink: 0 }}
                                        >
                                            {isPostingLink ? <CircularProgress size={18} /> : 'Post'}
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            startIcon={<CopyIcon />}
                                            onClick={handleCopyInvite}
                                            sx={{ borderRadius: '10px', flexShrink: 0 }}
                                        >
                                            Invite
                                        </Button>
                                    </>
                                )}
                            </Box>
                        )}
                    </Paper>
                )}

                {currentRoom ? (
                    <>
                        {/* Links Grid */}
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            sx={{
                                flex: 1,
                                overflowY: 'auto',
                                pr: 1,
                            }}
                        >
                            {isLoadingContent ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 200,
                                    }}
                                >
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                            gap: 2,
                                        }}
                                    >
                                        {getFilteredLinks().map((link) => (
                                            <LinkCard
                                                key={link._id}
                                                link={link}
                                                onDelete={() => deleteLink(link._id)}
                                                onDragStart={(id) => setDraggedLinkId(id)}
                                                canDelete={
                                                    currentUserId === (typeof link.userId === 'object' ? link.userId._id : link.userId)
                                                }
                                            />
                                        ))}
                                    </Box>
                                </AnimatePresence>
                            )}

                            {!isLoadingContent && getFilteredLinks().length === 0 && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 300,
                                        gap: 2,
                                    }}
                                >
                                    <LinkIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
                                    <Typography color="text.secondary">
                                        No links shared yet. Be the first!
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </>
                ) : (
                    // No room selected
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                        }}
                    >
                        <Paper
                            variant="glass"
                            sx={{
                                p: 6,
                                borderRadius: '24px',
                                textAlign: 'center',
                                maxWidth: 400,
                            }}
                        >
                            <GroupIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                Social Link Sharing
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                Create a room to share links with your team using end-to-end encryption.
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setShowCreateDialog(true)}
                                sx={{ borderRadius: '12px' }}
                            >
                                Create Your First Room
                            </Button>
                        </Paper>
                    </Box>
                )}
            </Box>

            {/* Create Room Dialog */}
            <CreateRoomDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onSubmit={handleCreateRoom}
                isLoading={isCreating}
            />

            {/* Create Collection Dialog */}
            <CreateCollectionDialog
                open={showCollectionDialog}
                onClose={() => setShowCollectionDialog(false)}
                onSubmit={handleCreateCollection}
                isLoading={isCreatingCollection}
            />

            {/* Post Link Dialog */}
            <PostLinkDialog
                open={showPostLinkDialog}
                onClose={() => setShowPostLinkDialog(false)}
                onSubmit={handlePostLink}
                isLoading={isPostingLink}
            />

            {/* Mobile FAB */}
            {isMobile && currentRoom && (
                <Fab
                    color="primary"
                    aria-label="add link"
                    onClick={() => setShowPostLinkDialog(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 100,
                    }}
                >
                    <AddIcon />
                </Fab>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ borderRadius: '12px' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box >
    );
}

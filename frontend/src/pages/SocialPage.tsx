import { useState, useCallback, useEffect, memo, useMemo, useRef } from 'react';
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
    Delete as DeleteIcon,
    FiberManualRecord as DotIcon,
} from '@mui/icons-material';
// Internal store and components
import { useSocialStore, encryptWithAES, decryptWithAES } from '@/stores/useSocialStore';
import { useSessionStore } from '@/stores/sessionStore';
import { LinkCard } from '@/components/social/LinkCard';
import { CommentsOverlay } from '@/components/social/CommentsOverlay';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { Room, LinkPost, Collection } from '@/services/socialService';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
};

// Create Room Dialog (inline for simplicity)
const CreateRoomDialog = memo(({
    open,
    onClose,
    onSubmit,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string) => void;
    isLoading: boolean;
}) => {
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
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <Paper
                variant="solid"
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: '24px',
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
});

// Create Collection Dialog
const CreateCollectionDialog = memo(({
    open,
    onClose,
    onSubmit,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
    isLoading: boolean;
}) => {
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
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <Paper
                variant="solid"
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: '24px',
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
});

// Post Link Dialog
const PostLinkDialog = memo(({
    open,
    onClose,
    onSubmit,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (url: string) => void;
    isLoading: boolean;
}) => {
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
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <Paper
                variant="solid"
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: '24px',
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
});

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
    const deleteCollection = useSocialStore((state) => state.deleteCollection);
    const moveLink = useSocialStore((state) => state.moveLink);
    const createInvite = useSocialStore((state) => state.createInvite);
    const decryptRoomMetadata = useSocialStore((state) => state.decryptRoomMetadata);
    const decryptCollectionMetadata = useSocialStore((state) => state.decryptCollectionMetadata);
    const markLinkViewed = useSocialStore((state) => state.markLinkViewed);
    const getUnviewedCountByCollection = useSocialStore((state) => state.getUnviewedCountByCollection);
    const viewedLinkIds = useSocialStore((state) => state.viewedLinkIds);
    const roomKeys = useSocialStore((state) => state.roomKeys);
    const commentCounts = useSocialStore((state) => state.commentCounts);

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

    // Collection context menu state
    const [collectionContextMenu, setCollectionContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        collectionId: string;
    } | null>(null);
    const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isDeletingCollection, setIsDeletingCollection] = useState(false);

    // Comments overlay state
    const [commentsLink, setCommentsLink] = useState<LinkPost | null>(null);

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

    // Auto-select first room when entering page
    useEffect(() => {
        if (!currentRoom && !roomId && rooms.length > 0 && !isLoadingRooms) {
            selectRoom(rooms[0]._id);
        }
    }, [rooms, currentRoom, roomId, isLoadingRooms, selectRoom]);

    // Auto-refresh content every 5 seconds (paused when comments overlay is open)
    useEffect(() => {
        if (!currentRoom || commentsLink) return;

        const interval = setInterval(() => {
            refreshCurrentRoom();
        }, 5000);

        return () => clearInterval(interval);
    }, [currentRoom, refreshCurrentRoom, commentsLink]);

    // Decrypt room names when rooms change
    useEffect(() => {
        const decryptNames = async () => {
            const results = await Promise.all(rooms.map(async (room) => {
                try {
                    const { name } = await decryptRoomMetadata(room);
                    return [room._id, name];
                } catch {
                    return [room._id, room.name.substring(0, 2)];
                }
            }));
            setDecryptedNames(new Map(results as [string, string][]));
        };

        if (rooms.length > 0) {
            decryptNames();
        }
    }, [rooms, decryptRoomMetadata]);

    // Decrypt collection names when they change
    useEffect(() => {
        const decryptNames = async () => {
            const results = await Promise.all(collections.map(async (col) => {
                try {
                    const { name } = await decryptCollectionMetadata(col);
                    return [col._id, name];
                } catch {
                    return [col._id, 'Encrypted Collection'];
                }
            }));
            setDecryptedCollections(new Map(results as [string, string][]));
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

    const handleCollectionContextMenu = (event: React.MouseEvent, collectionId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setCollectionContextMenu({
            mouseX: event.clientX,
            mouseY: event.clientY,
            collectionId,
        });
    };

    // Long press for mobile delete
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleCollectionTouchStart = (collectionId: string) => {
        longPressTimerRef.current = setTimeout(() => {
            setCollectionToDelete(collectionId);
            setDeleteConfirmOpen(true);
        }, 600); // 600ms long press
    };

    const handleCollectionTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleDeleteCollection = async () => {
        if (!collectionToDelete) return;
        setIsDeletingCollection(true);

        try {
            await deleteCollection(collectionToDelete);
            showSnackbar('Collection deleted', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to delete collection', 'error');
        }
        setIsDeletingCollection(false);
        setDeleteConfirmOpen(false);
        setCollectionToDelete(null);
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

    const filteredLinks = useMemo(() => {
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
                    borderRadius: isMobile ? 0 : '24px',
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                    overflowY: 'auto',
                    height: '100%',
                }}
            >
                {rooms.map((room) => (
                    <Tooltip key={room._id} title={decryptedNames.get(room._id) || 'Room'} placement="right">
                        <Avatar
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
                                transition: 'background-color 0.2s ease, transform 0.2s ease',
                                '&:hover': {
                                    bgcolor: currentRoom?._id === room._id
                                        ? 'primary.main'
                                        : alpha(theme.palette.primary.main, 0.3),
                                    transform: 'scale(1.05)',
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
                        borderRadius: isMobile ? 0 : '24px',
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

                    {collections.map((collection: Collection) => (
                        <Box
                            key={collection._id}
                            onClick={() => {
                                selectCollection(collection._id);
                                if (isMobile) setMobileDrawerOpen(false);
                            }}
                            onContextMenu={(e) => handleCollectionContextMenu(e, collection._id)}
                            onTouchStart={() => handleCollectionTouchStart(collection._id)}
                            onTouchEnd={handleCollectionTouchEnd}
                            onTouchMove={handleCollectionTouchEnd}
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
                                transition: 'background-color 0.2s ease, border-color 0.2s ease',
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: currentCollectionId === collection._id ? 600 : 400,
                                        color:
                                            currentCollectionId === collection._id
                                                ? 'primary.main'
                                                : 'text.primary',
                                        flex: 1,
                                    }}
                                >
                                    {decryptedCollections.get(collection._id) || (collection.type === 'links' ? 'Links' : 'Collection')}
                                </Typography>
                                {getUnviewedCountByCollection(collection._id) > 0 && (
                                    <DotIcon
                                        sx={{
                                            fontSize: 10,
                                            color: 'primary.main',
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    ))}
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
                {/* Header - Always visible */}
                {(
                    <Paper
                        variant="glass"
                        sx={{
                            p: 2,
                            borderRadius: isMobile ? '12px' : '24px',
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
                                    {currentRoom ? (decryptedNames.get(currentRoom._id) || 'Loading...') : (rooms.length > 0 ? 'Select a Room' : 'Social Rooms')}
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
                                {isSearchOpen ? (
                                    <Box
                                        sx={{
                                            width: 200,
                                            display: 'flex',
                                            transition: 'width 0.2s ease, opacity 0.2s ease',
                                            overflow: 'hidden'
                                        }}
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
                                                    borderRadius: '14px',
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
                                        variant: 'solid',
                                        elevation: 8,
                                        sx: {
                                            minWidth: 200,
                                            mt: 1,
                                            bgcolor: theme.palette.background.paper, // Opaque background
                                            backgroundImage: 'none',
                                            border: `1px solid ${theme.palette.divider}`,
                                        }
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
                                                    borderRadius: '14px',
                                                },
                                            }}
                                        />

                                        <Button
                                            variant="contained"
                                            onClick={() => handlePostLink()}
                                            disabled={!newLinkUrl.trim() || isPostingLink}
                                            sx={{ borderRadius: '14px', flexShrink: 0 }}
                                        >
                                            {isPostingLink ? <CircularProgress size={18} /> : 'Post'}
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            startIcon={<CopyIcon />}
                                            onClick={handleCopyInvite}
                                            sx={{ borderRadius: '14px', flexShrink: 0 }}
                                        >
                                            Invite
                                        </Button>
                                    </>
                                )}
                            </Box>
                        )}
                    </Paper>
                )}

                {/* Main Content Area */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        pr: 1,
                    }}
                >
                    {currentRoom ? (
                        // Room selected - show links or empty state
                        <>
                            {isLoadingContent ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 300,
                                    }}
                                >
                                    <CircularProgress />
                                </Box>
                            ) : filteredLinks.length > 0 ? (
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                        gap: 2,
                                    }}
                                >
                                    {filteredLinks.map((link: LinkPost) => (
                                        <LinkCard
                                            key={link._id}
                                            link={link}
                                            onDelete={() => deleteLink(link._id)}
                                            onDragStart={(id) => setDraggedLinkId(id)}
                                            onView={(id) => markLinkViewed(id)}
                                            onCommentsClick={(l) => setCommentsLink(l)}
                                            isViewed={viewedLinkIds.has(link._id)}
                                            commentCount={commentCounts[link._id] || 0}
                                            canDelete={
                                                currentUserId === (typeof link.userId === 'object' ? link.userId._id : link.userId)
                                            }
                                        />
                                    ))}
                                </Box>
                            ) : (
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
                        </>
                    ) : (
                        // No room selected - show contextual message
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                minHeight: 300,
                                gap: 2,
                            }}
                        >
                            {isLoadingRooms ? (
                                // Loading rooms
                                <CircularProgress />
                            ) : rooms.length > 0 ? (
                                // User has rooms but none selected
                                <>
                                    <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
                                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                                        Select a room from the sidebar to view shared links
                                    </Typography>
                                </>
                            ) : (
                                // User has no rooms
                                <>
                                    <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
                                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                                        Create or join a room to start sharing links
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => setShowCreateDialog(true)}
                                        sx={{ borderRadius: '12px', mt: 1 }}
                                    >
                                        Create Room
                                    </Button>
                                </>
                            )}
                        </Box>
                    )}
                </Box>
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

            {/* Collection Context Menu */}
            <Menu
                open={collectionContextMenu !== null}
                onClose={() => setCollectionContextMenu(null)}
                anchorReference="anchorPosition"
                anchorPosition={
                    collectionContextMenu !== null
                        ? { top: collectionContextMenu.mouseY, left: collectionContextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={() => {
                    if (collectionContextMenu) {
                        setCollectionToDelete(collectionContextMenu.collectionId);
                    }
                    setCollectionContextMenu(null);
                    setDeleteConfirmOpen(true);
                }} sx={{ color: 'error.main', gap: 1 }}>
                    <DeleteIcon fontSize="small" />
                    Delete Collection
                </MenuItem>
            </Menu>

            {/* Delete Collection Confirmation Dialog */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Delete Collection"
                message={`Are you sure you want to delete "${collectionToDelete ? decryptedCollections.get(collectionToDelete) || 'this collection' : ''}"? All links in this collection will be permanently deleted.`}
                confirmText="Delete"
                onConfirm={handleDeleteCollection}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setCollectionToDelete(null);
                }}
                isLoading={isDeletingCollection}
                variant="danger"
            />

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
                    sx={{ borderRadius: '14px' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Comments Overlay */}
            {commentsLink && currentRoom && (
                <CommentsOverlay
                    open={!!commentsLink}
                    onClose={() => setCommentsLink(null)}
                    link={commentsLink}
                    currentUserId={currentUserId}
                    encryptComment={async (text) => {
                        const roomKey = roomKeys.get(currentRoom._id);
                        if (!roomKey) throw new Error('Room key not available');
                        return encryptWithAES(roomKey, text);
                    }}
                    decryptComment={async (encrypted) => {
                        const roomKey = roomKeys.get(currentRoom._id);
                        if (!roomKey) throw new Error('Room key not available');
                        return decryptWithAES(roomKey, encrypted);
                    }}
                />
            )}
        </Box >
    );
}

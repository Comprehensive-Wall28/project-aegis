import { useState, useCallback, useEffect, memo, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    Skeleton,
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
    Share as ShareIcon,
    ArrowBack as ArrowBackIcon,
    Delete as DeleteIcon,
    FiberManualRecord as DotIcon,
} from '@mui/icons-material';
// Internal store and components
import { useSocialStore, encryptWithAES, decryptWithAES } from '@/stores/useSocialStore';
import { useSessionStore } from '@/stores/sessionStore';
import { LinkCard } from '@/components/social/LinkCard';
import { CommentsOverlay } from '@/components/social/CommentsOverlay';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import socketService from '@/services/socketService';
import type { Room, LinkPost } from '@/services/socialService';
import { motion, AnimatePresence } from 'framer-motion';

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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim(), description.trim());
        }
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <Box
                    component={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        backdropFilter: isMobile ? 'none' : 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: isMobile ? 0 : 4,
                    }}
                >
                    <Paper
                        variant={isMobile ? "solid" : "glass"}
                        component={motion.div}
                        initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                        exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                        transition={isMobile ? { type: 'spring', damping: 25, stiffness: 300 } : {}}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                            width: '100%',
                            maxWidth: isMobile ? '100%' : 450,
                            height: isMobile ? '100%' : 'auto',
                            maxHeight: isMobile ? '100%' : '90vh',
                            overflow: 'hidden',
                            borderRadius: isMobile ? 0 : '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: isMobile ? theme.palette.background.paper : alpha(theme.palette.background.paper, 0.95),
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Create New Room</Typography>
                            <IconButton onClick={onClose}><CloseIcon /></IconButton>
                        </Box>

                        <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
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
                                sx={{ mb: 1 }}
                            />
                        </Box>

                        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!name.trim() || isLoading}
                                sx={{ borderRadius: '12px', px: 4 }}
                            >
                                {isLoading ? <CircularProgress size={20} /> : 'Create'}
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            )}
        </AnimatePresence>,
        document.body
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim());
            setName('');
        }
    };

    useEffect(() => {
        if (!open) setName('');
    }, [open]);

    return createPortal(
        <AnimatePresence>
            {open && (
                <Box
                    component={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        backdropFilter: isMobile ? 'none' : 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: isMobile ? 0 : 4,
                    }}
                >
                    <Paper
                        variant={isMobile ? "solid" : "glass"}
                        component={motion.div}
                        initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                        exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                        transition={isMobile ? { type: 'spring', damping: 25, stiffness: 300 } : {}}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                            width: '100%',
                            maxWidth: isMobile ? '100%' : 400,
                            height: isMobile ? '100%' : 'auto',
                            maxHeight: isMobile ? '100%' : '90vh',
                            overflow: 'hidden',
                            borderRadius: isMobile ? 0 : '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: isMobile ? theme.palette.background.paper : alpha(theme.palette.background.paper, 0.95),
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>New Collection</Typography>
                            <IconButton onClick={onClose}><CloseIcon /></IconButton>
                        </Box>

                        <Box sx={{ p: 3, flex: 1 }}>
                            <TextField
                                fullWidth
                                label="Collection Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                sx={{ mb: 1 }}
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            />
                        </Box>

                        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!name.trim() || isLoading}
                                sx={{ borderRadius: '12px', px: 4 }}
                            >
                                {isLoading ? <CircularProgress size={20} /> : 'Create'}
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            )}
        </AnimatePresence>,
        document.body
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSubmit = () => {
        if (url.trim()) {
            onSubmit(url.trim());
            setUrl('');
        }
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <Box
                    component={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        backdropFilter: isMobile ? 'none' : 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: isMobile ? 0 : 4,
                    }}
                >
                    <Paper
                        variant={isMobile ? "solid" : "glass"}
                        component={motion.div}
                        initial={isMobile ? { y: '100%' } : { scale: 0.8, opacity: 0 }}
                        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                        exit={isMobile ? { y: '100%' } : { scale: 0.8, opacity: 0 }}
                        transition={isMobile ? { type: 'spring', damping: 30, stiffness: 350 } : {}}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                            width: '100%',
                            maxWidth: isMobile ? '100%' : 450,
                            height: isMobile ? '100%' : 'auto',
                            maxHeight: isMobile ? '100%' : '90vh',
                            overflow: 'hidden',
                            borderRadius: isMobile ? 0 : '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: isMobile ? theme.palette.background.paper : alpha(theme.palette.background.paper, 0.95),
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Post a Link</Typography>
                            <IconButton onClick={onClose}><CloseIcon /></IconButton>
                        </Box>

                        <Box sx={{ p: 3, flex: 1 }}>
                            <TextField
                                fullWidth
                                label="URL"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                sx={{ mb: 1 }}
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
                        </Box>

                        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!url.trim() || isLoading}
                                sx={{ borderRadius: '12px', px: 4 }}
                            >
                                {isLoading ? <CircularProgress size={20} /> : 'Post'}
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            )}
        </AnimatePresence>,
        document.body
    );
});

// Room Card Component - Memoized for performance
const RoomCard = memo(({
    decryptedName,
    memberCount,
    onSelect,
}: {
    room: Room; // kept for key prop usage
    decryptedName: string;
    memberCount: number;
    onSelect: () => void;
}) => {
    const theme = useTheme();

    return (
        <Paper
            variant="glass"
            onClick={onSelect}
            sx={{
                p: 3,
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: 140,
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                    sx={{
                        width: 48,
                        height: 48,
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                        color: 'primary.main',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                    }}
                >
                    {decryptedName.substring(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {decryptedName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {memberCount} member{memberCount > 1 ? 's' : ''}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
                <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                    Tap to enter
                </Typography>
            </Box>
        </Paper>
    );
});

// Create Room Card - Memoized for performance
const CreateRoomCard = memo(({
    onClick,
}: {
    onClick: () => void;
}) => {
    const theme = useTheme();

    return (
        <Paper
            variant="glass"
            onClick={onClick}
            sx={{
                p: 3,
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                minHeight: 140,
                border: `2px dashed ${alpha(theme.palette.success.main, 0.4)}`,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                '&:hover': {
                    borderColor: theme.palette.success.main,
                },
            }}
        >
            <IconButton
                sx={{
                    width: 56,
                    height: 56,
                    bgcolor: alpha(theme.palette.success.main, 0.15),
                    color: 'success.main',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.25),
                    },
                }}
            >
                <AddIcon sx={{ fontSize: 28 }} />
            </IconButton>
            <Typography variant="body1" fontWeight={500} color="success.main">
                Create Room
            </Typography>
        </Paper>
    );
});

// Skeleton for Collections
const CollectionSkeleton = () => {
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: '10px',
        }}>
            <Skeleton variant="circular" width={18} height={18} />
            <Skeleton variant="text" width="70%" height={24} />
        </Box>
    );
};

// Skeleton for Link Cards
const LinkCardSkeleton = () => {
    const theme = useTheme();
    return (
        <Paper
            variant="glass"
            sx={{
                borderRadius: '24px',
                height: 280,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
            }}
        >
            <Skeleton variant="rectangular" height={140} />
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Skeleton variant="text" width="90%" height={28} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="60%" height={20} />
                <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton variant="text" width="30%" height={16} />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Skeleton variant="circular" width={24} height={24} />
                        <Skeleton variant="circular" width={24} height={24} />
                        <Skeleton variant="circular" width={24} height={24} />
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

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
    const unmarkLinkViewed = useSocialStore((state) => state.unmarkLinkViewed);
    const getUnviewedCountByCollection = useSocialStore((state) => state.getUnviewedCountByCollection);
    const viewedLinkIds = useSocialStore((state) => state.viewedLinkIds);
    const roomKeys = useSocialStore((state) => state.roomKeys);
    const commentCounts = useSocialStore((state) => state.commentCounts);
    const hasMoreLinks = useSocialStore((state) => state.hasMoreLinks);
    const isLoadingLinks = useSocialStore((state) => state.isLoadingLinks);
    const loadMoreLinks = useSocialStore((state) => state.loadMoreLinks);

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

    const [searchQuery, setSearchQuery] = useState('');
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [optimisticRoomId, setOptimisticRoomId] = useState<string | null>(null);

    // Mobile Responsive State
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    // View mode: 'rooms' shows room cards, 'room-content' shows collections/links
    const [viewMode, setViewMode] = useState<'rooms' | 'room-content'>('rooms');

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

    // Socket room management cleanup
    useEffect(() => {
        return () => {
            if (currentRoom) {
                socketService.leaveRoom(currentRoom._id);
            }
        };
    }, [currentRoom]);

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

    // Switch to room-content view when a room is selected


    // Auto-refresh removed in favor of real-time socket updates

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

    // Scroll links to top when collection changes
    useEffect(() => {
        linksContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentCollectionId]);

    const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    };

    // Exit room and return to rooms view
    const handleExitRoom = useCallback(() => {
        setViewMode('rooms');
        setOptimisticRoomId(null);
    }, []);

    const handleSelectRoom = useCallback(async (roomId: string) => {
        setOptimisticRoomId(roomId);
        setViewMode('room-content');
        await selectRoom(roomId);
    }, [selectRoom]);

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

    // Ref for links container to scroll to top on collection change
    const linksContainerRef = useRef<HTMLDivElement>(null);

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
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, overflow: 'hidden' }}>
                {/* Header */}
                <Paper
                    variant="glass"
                    sx={{
                        p: 2,
                        borderRadius: isMobile ? '12px' : '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                        minHeight: 88,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Back button when viewing room content */}
                        {viewMode === 'room-content' && (optimisticRoomId || currentRoom) ? (
                            <IconButton onClick={handleExitRoom} edge="start" sx={{ mr: -0.5 }}>
                                <ArrowBackIcon />
                            </IconButton>
                        ) : (
                            <GroupIcon sx={{ color: 'primary.main' }} />
                        )}
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {viewMode === 'room-content' && (optimisticRoomId || currentRoom)
                                    ? (decryptedNames.get(optimisticRoomId || currentRoom?._id || '') || 'Loading...')
                                    : 'Social Rooms'}
                            </Typography>
                            {viewMode === 'room-content' && currentRoom && (
                                <Typography variant="caption" color="text.secondary">
                                    {currentRoom.memberCount || 1} member{(currentRoom.memberCount || 1) > 1 ? 's' : ''}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {viewMode === 'room-content' && currentRoom && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' }}>
                            {/* Search Bar - Persistent on Desktop */}
                            {!isMobile && (
                                <Box
                                    sx={{
                                        width: 250,
                                        display: 'flex',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <TextField
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
                                            endAdornment: searchQuery ? (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setSearchQuery('')}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </InputAdornment>
                                            ) : undefined,
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '14px',
                                                bgcolor: alpha(theme.palette.background.paper, 0.5),
                                            }
                                        }}
                                    />
                                </Box>
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

                {/* Main Content Area */}
                <Box
                    sx={{
                        flex: 1,
                        overflowX: 'hidden',
                        overflowY: viewMode === 'rooms' ? 'auto' : 'hidden',
                        pr: viewMode === 'rooms' ? 1 : 0,
                        pt: viewMode === 'rooms' ? 1 : 0, // 8px padding
                        px: viewMode === 'rooms' ? 1 : 0,
                    }}
                >
                    <AnimatePresence mode="wait">
                        {viewMode === 'rooms' ? (
                            // Rooms Grid View
                            <Box
                                key="rooms-grid"
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, 1fr)',
                                        md: 'repeat(3, 1fr)',
                                        lg: 'repeat(4, 1fr)',
                                    },
                                    gap: 2,
                                    pb: isMobile ? 12 : 2,
                                    willChange: !isMobile ? 'opacity, transform' : 'auto',
                                }}
                            >
                                {isLoadingRooms ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: 300,
                                            gridColumn: '1 / -1',
                                        }}
                                    >
                                        <CircularProgress />
                                    </Box>
                                ) : (
                                    <>
                                        {rooms.map((room) => (
                                            <RoomCard
                                                key={room._id}
                                                room={room}
                                                decryptedName={decryptedNames.get(room._id) || 'Loading...'}
                                                memberCount={room.memberCount || 1}
                                                onSelect={() => handleSelectRoom(room._id)}
                                            />
                                        ))}
                                        <CreateRoomCard onClick={() => setShowCreateDialog(true)} />
                                    </>
                                )}
                            </Box>
                        ) : (
                            // Room Content View
                            <Box
                                key="room-content"
                                component={motion.div}
                                initial={!isMobile ? { opacity: 0, y: 5, scale: 0.99 } : undefined}
                                animate={!isMobile ? { opacity: 1, y: 0, scale: 1 } : undefined}
                                transition={{
                                    duration: 0.2,
                                    ease: "easeInOut",
                                    scale: { duration: 0.2 }
                                }}
                                sx={{
                                    display: 'flex',
                                    gap: 2,
                                    height: '100%',
                                    willChange: !isMobile ? 'opacity, transform' : 'auto',
                                }}
                            >
                                {/* Collections Sidebar */}
                                {!isMobile && (
                                    <Paper
                                        variant="glass"
                                        sx={{
                                            width: 200,
                                            flexShrink: 0,
                                            borderRadius: '20px',
                                            p: 2,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1,
                                            height: '100%',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
                                            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
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

                                        <Box sx={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1,
                                            mx: -0.5,
                                            px: 0.5,
                                        }}>
                                            {isLoadingContent ? (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <CollectionSkeleton key={`col-skel-${i}`} />
                                                ))
                                            ) : (
                                                collections.map((collection) => (
                                                    <Box
                                                        key={collection._id}
                                                        onClick={() => selectCollection(collection._id)}
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
                                                            transition: 'background-color 0.15s ease',
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
                                                ))
                                            )}
                                        </Box>
                                    </Paper>
                                )}

                                {/* Mobile Collections Drawer */}
                                <Drawer
                                    anchor="left"
                                    open={mobileDrawerOpen}
                                    onClose={() => setMobileDrawerOpen(false)}
                                    PaperProps={{
                                        sx: {
                                            bgcolor: 'background.default',
                                            backgroundImage: 'none',
                                            width: 240,
                                            p: 2,
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="h6" fontWeight={600}>Collections</Typography>
                                        <IconButton size="small" onClick={() => setMobileDrawerOpen(false)}>
                                            <CloseIcon />
                                        </IconButton>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {collections.map((collection) => (
                                            <Box
                                                key={collection._id}
                                                onClick={() => {
                                                    selectCollection(collection._id);
                                                    setMobileDrawerOpen(false);
                                                }}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                    p: 1.5,
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    bgcolor:
                                                        currentCollectionId === collection._id
                                                            ? alpha(theme.palette.primary.main, 0.15)
                                                            : 'transparent',
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    },
                                                }}
                                                onTouchStart={() => handleCollectionTouchStart(collection._id)}
                                                onTouchEnd={handleCollectionTouchEnd}
                                                onTouchMove={handleCollectionTouchEnd}
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
                                                    }}
                                                >
                                                    {decryptedCollections.get(collection._id) || 'Collection'}
                                                </Typography>
                                                {getUnviewedCountByCollection(collection._id) > 0 && (
                                                    <DotIcon sx={{ fontSize: 10, color: 'primary.main', ml: 'auto' }} />
                                                )}
                                            </Box>
                                        ))}
                                        <Divider sx={{ my: 1 }} />
                                        <Button
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                                setShowCollectionDialog(true);
                                                setMobileDrawerOpen(false);
                                            }}
                                            sx={{ justifyContent: 'flex-start' }}
                                        >
                                            New Collection
                                        </Button>
                                    </Box>
                                </Drawer>

                                {/* Links Content */}
                                <Box
                                    ref={linksContainerRef}
                                    sx={{
                                        flex: 1,
                                        minWidth: 0,
                                        height: '100%',
                                        overflowX: 'hidden',
                                        overflowY: 'auto',
                                        pr: 1,
                                        pt: 1, // 8px padding to prevent any clipping
                                        px: 1, // 8px side padding
                                        pb: isMobile ? 12 : 2,
                                    }}>
                                    {/* Mobile collections button and search */}
                                    {isMobile && (
                                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<CollectionIcon />}
                                                onClick={() => setMobileDrawerOpen(true)}
                                                sx={{
                                                    borderRadius: '12px',
                                                    flexShrink: 0,
                                                    whiteSpace: 'nowrap',
                                                    borderColor: alpha(theme.palette.divider, 0.2),
                                                    color: 'text.primary',
                                                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                                                    maxWidth: '45%', // Limit width
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    justifyContent: 'flex-start', // Ensure icon stays left
                                                    '& .MuiButton-startIcon': { flexShrink: 0 }, // Prevent icon shrink
                                                    '& .MuiButton-endIcon': { flexShrink: 0 },
                                                }}
                                            >
                                                <Typography variant="button" noWrap sx={{ textTransform: 'none' }}>
                                                    {decryptedCollections.get(currentCollectionId || '') || 'Collections'}
                                                </Typography>
                                            </Button>
                                            <TextField
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
                                                    endAdornment: searchQuery ? (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setSearchQuery('')}
                                                            >
                                                                <CloseIcon fontSize="small" />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ) : undefined
                                                }}
                                                sx={{
                                                    flex: 1,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: '12px',
                                                        bgcolor: alpha(theme.palette.background.paper, 0.5),
                                                        '& fieldset': {
                                                            borderColor: alpha(theme.palette.divider, 0.2),
                                                        },
                                                    }
                                                }}
                                            />
                                        </Box>
                                    )}

                                    {(isLoadingContent || (isLoadingLinks && filteredLinks.length === 0)) ? (
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                gap: 2,
                                            }}
                                        >
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <LinkCardSkeleton key={`link-skel-${i}`} />
                                            ))}
                                        </Box>
                                    ) : filteredLinks.length > 0 ? (
                                        <>
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
                                                        onUnview={(id) => unmarkLinkViewed(id)}
                                                        onCommentsClick={(l) => setCommentsLink(l)}
                                                        isViewed={viewedLinkIds.has(link._id)}
                                                        commentCount={commentCounts[link._id] || 0}
                                                        canDelete={
                                                            currentUserId === (typeof link.userId === 'object' ? link.userId._id : link.userId)
                                                        }
                                                    />
                                                ))}
                                            </Box>

                                            {hasMoreLinks && (
                                                <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'center' }}>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => loadMoreLinks()}
                                                        disabled={isLoadingLinks}
                                                        startIcon={isLoadingLinks ? <CircularProgress size={20} /> : null}
                                                        sx={{
                                                            borderRadius: '12px',
                                                            px: 4,
                                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                                            '&:hover': {
                                                                borderColor: theme.palette.primary.main,
                                                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                                            }
                                                        }}
                                                    >
                                                        {isLoadingLinks ? 'Loading...' : 'Load More'}
                                                    </Button>
                                                </Box>
                                            )}
                                        </>
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
                                </Box>
                            </Box>
                        )}
                    </AnimatePresence>
                </Box>

                {/* Create Room Dialog */}
                < CreateRoomDialog
                    open={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)
                    }
                    onSubmit={handleCreateRoom}
                    isLoading={isCreating}
                />

                {/* Create Collection Dialog */}
                < CreateCollectionDialog
                    open={showCollectionDialog}
                    onClose={() => setShowCollectionDialog(false)}
                    onSubmit={handleCreateCollection}
                    isLoading={isCreatingCollection}
                />

                {/* Post Link Dialog */}
                < PostLinkDialog
                    open={showPostLinkDialog}
                    onClose={() => setShowPostLinkDialog(false)}
                    onSubmit={handlePostLink}
                    isLoading={isPostingLink}
                />

                {/* Mobile FAB */}
                {
                    isMobile && currentRoom && (
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
                    )
                }

                {/* Collection Context Menu */}
                <Menu
                    open={collectionContextMenu !== null}
                    onClose={() => setCollectionContextMenu(null)}
                    anchorReference="anchorPosition"
                    anchorPosition={
                        collectionContextMenu
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
                    message={`Are you sure you want to delete "${collectionToDelete ? decryptedCollections.get(collectionToDelete!) || 'this collection' : ''}"? All links in this collection will be permanently deleted.`}
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
                {
                    commentsLink && currentRoom && (
                        <CommentsOverlay
                            open={!!commentsLink}
                            onClose={() => setCommentsLink(null)}
                            link={commentsLink!}
                            currentUserId={currentUserId}
                            encryptComment={async (text) => {
                                if (!currentRoom) throw new Error('No room selected');
                                const roomKey = roomKeys.get(currentRoom._id);
                                if (!roomKey) throw new Error('Room key not available');
                                return encryptWithAES(roomKey, text);
                            }}
                            decryptComment={async (encrypted) => {
                                if (!currentRoom) throw new Error('No room selected');
                                const roomKey = roomKeys.get(currentRoom._id);
                                if (!roomKey) throw new Error('Room key not available');
                                return decryptWithAES(roomKey, encrypted);
                            }}
                        />
                    )
                }
            </Box >
        </Box >
    );
}

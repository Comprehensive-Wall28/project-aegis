import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
    Box,
    Typography,
    alpha,
    useTheme,
    LinearProgress,
    Snackbar,
    Alert,
    Menu,
    MenuItem,
    useMediaQuery,
    Fab,
    Button,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Lock as LockIcon,
    Home as HomeIcon,
} from '@mui/icons-material';
// Internal store and components
import { useSocialStore, encryptWithAES, decryptWithAES } from '@/stores/useSocialStore';
import { SOCIAL_SNACKBAR_Z_INDEX } from '@/components/social/constants';
import { useSessionStore } from '@/stores/sessionStore';
import { CommentsOverlay } from '@/components/social/CommentsOverlay';
import { ReaderModeOverlay } from '@/components/social/ReaderModeOverlay';
import { ZenModeOverlay } from '@/components/social/ZenModeOverlay';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import socketService from '@/services/socketService';
import type { LinkPost } from '@/services/socialService';
import { motion, AnimatePresence } from 'framer-motion';

// Modular Components
import { CreateRoomDialog, CreateCollectionDialog, PostLinkDialog, MoveLinkDialog } from '@/components/social/SocialDialogs';
import { RoomCard, CreateRoomCard } from '@/components/social/RoomCards';
import { SocialHeader } from '@/components/social/SocialHeader';
import { SocialSidebar } from '@/components/social/SocialSidebar';
import { LinksContainer } from '@/components/social/LinksContainer';
import { SocialErrorBoundary } from '@/components/social/SocialErrorBoundary';

export function SocialPage() {
    const theme = useTheme();

    type SnackbarState = {
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info';
    };
    const { roomId } = useParams<{ roomId?: string }>();
    const navigate = useNavigate();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    // Store state
    // Consolidated State Selector
    const {
        rooms,
        currentRoom,
        collections,
        currentCollectionId,
        links,
        isLoadingContent,
        isLoadingRooms,
        error,
        viewedLinkIds,
        roomKeys,
        commentCounts,
        hasMoreLinks,
        isLoadingLinks,
        isSearchingLinks,
    } = useSocialStore(
        useShallow((state) => ({
            rooms: state.rooms,
            currentRoom: state.currentRoom,
            collections: state.collections,
            currentCollectionId: state.currentCollectionId,
            links: state.links,
            isLoadingContent: state.isLoadingContent,
            isLoadingRooms: state.isLoadingRooms,
            error: state.error,
            viewedLinkIds: state.viewedLinkIds,
            roomKeys: state.roomKeys,
            commentCounts: state.commentCounts,
            hasMoreLinks: state.hasMoreLinks,
            isLoadingLinks: state.isLoadingLinks,
            isSearchingLinks: state.isSearchingLinks,
        }))
    );

    // Consolidated Actions Selector
    const {
        clearError,
        selectRoom,
        selectCollection,
        createRoom,
        postLink,
        deleteLink,
        createCollection,
        deleteCollection,
        moveLink,
        createInvite,
        markLinkViewed,
        unmarkLinkViewed,
        getUnviewedCountByCollection,
        loadAllLinks,
        searchRoomLinks,
        clearRoomContent,
    } = useSocialStore(
        useShallow((state) => ({
            fetchRooms: state.fetchRooms,
            clearError: state.clearError,
            selectRoom: state.selectRoom,
            selectCollection: state.selectCollection,
            createRoom: state.createRoom,
            postLink: state.postLink,
            deleteLink: state.deleteLink,
            createCollection: state.createCollection,
            deleteCollection: state.deleteCollection,
            moveLink: state.moveLink,
            createInvite: state.createInvite,
            markLinkViewed: state.markLinkViewed,
            unmarkLinkViewed: state.unmarkLinkViewed,
            getUnviewedCountByCollection: state.getUnviewedCountByCollection,
            loadAllLinks: state.loadAllLinks,
            searchRoomLinks: state.searchRoomLinks,
            clearRoomContent: state.clearRoomContent,
        }))
    );

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
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedUploader, setSelectedUploader] = useState<string | null>(null);
    const [viewFilter, setViewFilter] = useState<'all' | 'viewed' | 'unviewed'>('all');
    const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
    const [showMoveDialog, setShowMoveDialog] = useState(false);
    const [linkToMove, setLinkToMove] = useState<LinkPost | null>(null);
    const [isMovingLink, setIsMovingLink] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [postLinkError, setPostLinkError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [optimisticRoomId, setOptimisticRoomId] = useState<string | null>(null);

    // Mobile Responsive State
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    // Share Intent State
    const [pendingShareUrl, setPendingShareUrl] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    // View mode: 'rooms' shows room cards, 'room-content' shows collections/links
    // Use optimisticRoomId to switch instantly
    const viewMode = (roomId || optimisticRoomId) ? 'room-content' : 'rooms';

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

    // Reader mode overlay state
    const [readerLink, setReaderLink] = useState<LinkPost | null>(null);

    // Preview (Maximize) overlay state
    const [previewLink, setPreviewLink] = useState<LinkPost | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Zen Mode overlay state
    const [zenModeOpen, setZenModeOpen] = useState(false);

    // Socket room management cleanup: 
    // Leave the room when the roomId changes or we unmount.
    useEffect(() => {
        const activeRoomId = currentRoom?._id;
        return () => {
            if (activeRoomId) {
                socketService.leaveRoom(activeRoomId);
            }
        };
    }, [currentRoom?._id]);

    // Page-level cleanup: Clear everything only when navigating away from Social completely.
    useEffect(() => {
        return () => {
            clearRoomContent();
        };
    }, [clearRoomContent]);

    // URL Synchronization Helper
    const toggleOverlay = useCallback((key: string, value: string | boolean | null) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (value === null || value === false) {
                next.delete(key);
            } else {
                next.set(key, String(value));
            }
            return next;
        });
    }, [setSearchParams]);

    const showSnackbar = useCallback((message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const handlePostLink = useCallback(async (url?: string) => {
        const linkToPost = url || newLinkUrl;
        if (!linkToPost.trim()) return;

        try {
            setIsPostingLink(true);
            setPostLinkError(null);
            await postLink(linkToPost.trim());
            setNewLinkUrl('');
            toggleOverlay('post', null);
            showSnackbar('Link shared successfully', 'success');
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || 'Failed to post link';
            setPostLinkError(message);
            if (!isMobile) {
                showSnackbar(message, 'error');
            }
        } finally {
            setIsPostingLink(false);
        }
    }, [newLinkUrl, postLink, isMobile, showSnackbar, toggleOverlay]);

    // Hot Share Listener: Listen for AEGIS_SHARE_INTENT events from browser extension
    useEffect(() => {
        const handleShareIntent = (event: CustomEvent<{ url: string }>) => {
            const { url } = event.detail;
            if (!url) return;

            if (currentRoom) {
                // Room is active, auto submit
                handlePostLink(url);
            } else {
                // No room selected, save for later
                setPendingShareUrl(url);
                showSnackbar('Select a room to share this link', 'info');
            }
        };

        window.addEventListener('AEGIS_SHARE_INTENT', handleShareIntent as EventListener);
        return () => {
            window.removeEventListener('AEGIS_SHARE_INTENT', handleShareIntent as EventListener);
        };
    }, [currentRoom, handlePostLink, showSnackbar]);

    // Keyboard Shortcut Listener: Ctrl+F for Zen Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Toggle Zen Mode on Ctrl+F or Cmd+F
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                if (currentRoom) {
                    e.preventDefault();
                    toggleOverlay('zen', !zenModeOpen);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentRoom, zenModeOpen, toggleOverlay]);

    // Cold Share Logic: Check for share_url query parameter on load
    useEffect(() => {
        const shareUrl = searchParams.get('share_url');
        if (shareUrl) {
            // Clean the URL to prevent re-triggering on refresh
            searchParams.delete('share_url');
            setSearchParams(searchParams, { replace: true });

            if (currentRoom) {
                // Room is already active (e.g., via deep link), auto submit
                handlePostLink(shareUrl);
            } else {
                // Save for when user enters a room
                setPendingShareUrl(shareUrl);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Room Entry Logic: Auto submit when user enters a room with pending share URL
    useEffect(() => {
        if (currentRoom && pendingShareUrl) {
            handlePostLink(pendingShareUrl);
            setPendingShareUrl(null);
        }
    }, [currentRoom, pendingShareUrl, handlePostLink]);

    // Fetch rooms on mount
    useEffect(() => {
        if (pqcEngineStatus === 'operational') {
            useSocialStore.getState().fetchRooms();
        }
    }, [pqcEngineStatus]);

    // Progressive Room Entry:
    // Defer rendering of heavy content (Sidebar, LinksContainer) by a few frames
    // to allow the Header animation to start INSTANTLY without main-thread blocking.
    const [shouldRenderContent, setShouldRenderContent] = useState(false);

    useEffect(() => {
        if (viewMode === 'room-content') {
            // Immediate reset first to ensure clean slab
            setShouldRenderContent(false);

            // Longer delay (120ms) to let the header's 150ms animation
            // gain significant momentum before heavy link card rendering starts.
            const timer = setTimeout(() => {
                setShouldRenderContent(true);
            }, 120);
            return () => clearTimeout(timer);
        } else {
            setShouldRenderContent(false);
        }
    }, [viewMode, roomId]);



    // Sync URL parameters with overlay states
    useEffect(() => {
        const commentsId = searchParams.get('comments');
        const readerId = searchParams.get('reader');
        const moveId = searchParams.get('move');
        const previewId = searchParams.get('preview');
        const post = searchParams.get('post') === 'true';
        const createRoom = searchParams.get('createRoom') === 'true';
        const createCol = searchParams.get('createCol') === 'true';
        const zen = searchParams.get('zen') === 'true';

        // Use functional updates to avoid unnecessary triggers if already in sync
        if (commentsId) {
            const link = links.find(l => l._id === commentsId);
            if (link && commentsLink?._id !== commentsId) setCommentsLink(link);
        } else if (commentsLink) {
            setCommentsLink(null);
        }

        if (readerId) {
            const link = links.find(l => l._id === readerId);
            if (link && readerLink?._id !== readerId) setReaderLink(link);
        } else if (readerLink) {
            setReaderLink(null);
        }

        if (moveId) {
            const link = links.find(l => l._id === moveId);
            if (link && (linkToMove?._id !== moveId || !showMoveDialog)) {
                setLinkToMove(link);
                setShowMoveDialog(true);
            }
        } else if (showMoveDialog) {
            setShowMoveDialog(false);
            setLinkToMove(null);
        }

        if (previewId) {
            const link = links.find(l => l._id === previewId);
            if (link && (previewLink?._id !== previewId || !showPreview)) {
                setPreviewLink(link);
                setShowPreview(true);
            }
        } else if (showPreview) {
            setShowPreview(false);
            setPreviewLink(null);
        }

        if (post !== showPostLinkDialog) setShowPostLinkDialog(post);
        if (createRoom !== showCreateDialog) setShowCreateDialog(createRoom);
        if (createCol !== showCollectionDialog) setShowCollectionDialog(createCol);
        if (zen !== zenModeOpen) setZenModeOpen(zen);

    }, [searchParams, links, commentsLink?._id, readerLink?._id, showMoveDialog, linkToMove?._id, showPostLinkDialog, showCreateDialog, showCollectionDialog, showPreview, previewLink?._id, zenModeOpen]);

    // Reset room state when navigating back to the main social page
    useEffect(() => {
        if (!roomId) {
            setOptimisticRoomId(null);
            clearRoomContent();
            if (error) clearError();
        }
    }, [roomId, clearRoomContent, clearError, error]);

    useEffect(() => {
        if (roomId && pqcEngineStatus === 'operational') {
            selectRoom(roomId);
        }
    }, [roomId, pqcEngineStatus, selectRoom]);

    // Global Room Search: Automatically search across all collections
    // when a query is active, offloading to the server for scalability.
    useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            const timer = setTimeout(() => {
                searchRoomLinks(searchQuery.trim());
            }, 400); // 400ms debounce
            return () => clearTimeout(timer);
        } else if (searchQuery.trim().length === 0 && currentCollectionId) {
            // Revert to current collection view when search is cleared.
            // We pass 'true' to force a re-fetch since search results 
            // have overwritten the 'links' cache.
            selectCollection(currentCollectionId, true);
        }
    }, [searchQuery, searchRoomLinks, currentCollectionId, selectCollection]);

    // Switch to room-content view when a room is selected


    // Auto-refresh removed in favor of real-time socket updates

    // Decrypt room names - REMOVED for Lazy Decryption
    // Room components now handle their own decryption or display encrypted state

    // Decrypt collection names - REMOVED for Lazy Decryption
    // Sidebar handles collection name decryption lazily

    // Scroll links to top when collection changes
    useEffect(() => {
        linksContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentCollectionId]);



    // Exit room and return to rooms view
    const handleExitRoom = useCallback(() => {
        setOptimisticRoomId(null);
        clearError();
        clearRoomContent();
        navigate('/dashboard/social');
    }, [navigate, clearError, clearRoomContent]);

    const handleSelectRoom = useCallback(async (selectedRoomId: string) => {
        setOptimisticRoomId(selectedRoomId);
        navigate(`/dashboard/social/${selectedRoomId}`);
        // selectRoom is handled by useEffect when roomId changes
    }, [navigate]);

    const handleSelectCollection = useCallback((id: string) => {
        selectCollection(id);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('c', id);
        setSearchParams(newParams, { replace: true });
    }, [selectCollection, searchParams, setSearchParams]);

    useEffect(() => {
        const urlCollectionId = searchParams.get('c');
        if (urlCollectionId && roomId && collections.length > 0 && currentCollectionId !== urlCollectionId) {
            if (collections.some(c => c._id === urlCollectionId)) {
                selectCollection(urlCollectionId);
            }
        }
    }, [searchParams, roomId, collections, currentCollectionId, selectCollection]);

    const handleCreateRoom = async (name: string, description: string) => {
        try {
            setIsCreating(true);
            const room = await createRoom(name, description);
            toggleOverlay('createRoom', null);
            showSnackbar('Room created with end-to-end encryption', 'success');
            // Navigate to new room
            handleSelectRoom(room._id);
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to create room', 'error');
        } finally {
            setIsCreating(false);
        }
    };



    const handleCreateCollection = useCallback(async (name: string) => {
        if (!name.trim() || isCreatingCollection) return;

        setIsCreatingCollection(true);
        try {
            await createCollection(name.trim());
            toggleOverlay('createCol', null);
            showSnackbar('Collection created successfully', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to create collection', 'error');
        } finally {
            setIsCreatingCollection(false);
        }
    }, [isCreatingCollection, createCollection, showSnackbar]);

    const handleDrop = useCallback(async (collectionId: string) => {
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
    }, [draggedLinkId, links, moveLink, showSnackbar]);

    const handleMoveLink = useCallback(async (collectionId: string) => {
        if (!linkToMove || isMovingLink) return;

        setIsMovingLink(true);
        try {
            await moveLink(linkToMove._id, collectionId);
            toggleOverlay('move', null);
            setLinkToMove(null);
            showSnackbar('Link moved successfully', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to move link', 'error');
        } finally {
            setIsMovingLink(false);
        }
    }, [linkToMove, isMovingLink, moveLink, showSnackbar]);

    const handleOpenMoveDialog = useCallback((link: LinkPost) => {
        toggleOverlay('move', link._id);
    }, [toggleOverlay]);

    const handleCollectionContextMenu = useCallback((event: React.MouseEvent, collectionId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setCollectionContextMenu({
            mouseX: event.clientX,
            mouseY: event.clientY,
            collectionId,
        });
    }, []);

    // Long press for mobile delete
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Ref for links container to scroll to top on collection change
    const linksContainerRef = useRef<HTMLDivElement>(null);

    const handleCollectionTouchStart = useCallback((collectionId: string) => {
        longPressTimerRef.current = setTimeout(() => {
            setCollectionToDelete(collectionId);
            setDeleteConfirmOpen(true);
        }, 600); // 600ms long press
    }, []);

    const handleCollectionTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

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

    const handleDeleteLink = async (linkId: string) => {
        try {
            await deleteLink(linkId);
            showSnackbar('Link deleted successfully', 'success');
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || 'Failed to delete link';
            showSnackbar(message, 'error');
        }
    };

    const handleCopyInvite = useCallback(async () => {
        if (!currentRoom) return;

        try {
            const inviteUrl = await createInvite(currentRoom._id);
            await navigator.clipboard.writeText(inviteUrl);
            showSnackbar('Invite link copied to clipboard', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to create invite', 'error');
        }
    }, [currentRoom, createInvite, showSnackbar]);

    const uniqueUploaders = useMemo(() => {
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

        if (selectedUploader) {
            filtered = filtered.filter((l) =>
                typeof l.userId === 'object' && l.userId._id === selectedUploader
            );
        }

        // 1. Search Filtering: Now purely server-side.
        // The server returns the definitive set of links for the query.
        // We skip local filtering to prevent UI flicker between local/server results.

        // 2. Filter by viewed status (if not 'all')
        if (viewFilter !== 'all') {
            filtered = filtered.filter((l) => {
                const isViewed = viewedLinkIds.has(l._id);
                return viewFilter === 'viewed' ? isViewed : !isViewed;
            });
        }

        // Apply Sorting
        return [...filtered].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
        });
    }, [links, currentCollectionId, selectedUploader, viewFilter, searchQuery, viewedLinkIds, sortOrder]);

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


    // Loading context for skeletons
    const isInitializing = pqcEngineStatus !== 'operational';
    const effectiveIsLoadingRooms = isLoadingRooms || isInitializing;
    const effectiveIsLoadingContent = isLoadingContent || isInitializing;

    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    {error ? (
                        <Box
                            key="error-view"
                            component={motion.div}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                px: 3,
                                gap: 3,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '30px',
                                    bgcolor: alpha(theme.palette.error.main, 0.15),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 1,
                                }}
                            >
                                <LockIcon sx={{ fontSize: 48, color: 'error.main' }} />
                            </Box>

                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                                Access Denied
                            </Typography>

                            <Typography color="text.secondary" sx={{ maxWidth: 400, mb: 2 }}>
                                {error === 'Room not found'
                                    ? "The room you're looking for doesn't exist or has been deleted from the Aegis system."
                                    : "You don't have permission to access this room. It's encrypted and restricted to authorized members only."}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<HomeIcon />}
                                    onClick={handleExitRoom}
                                    sx={{
                                        borderRadius: '12px',
                                        px: 4,
                                        py: 1.5,
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Return to Social
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Box
                            key="social-content"
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}
                        >
                            <SocialErrorBoundary componentName="Header">
                                <SocialHeader
                                    viewMode={viewMode}
                                    isMobile={isMobile}
                                    optimisticRoomId={optimisticRoomId}
                                    currentRoom={currentRoom}
                                    handleExitRoom={handleExitRoom}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    handleFilterClick={handleFilterClick}
                                    selectedUploader={selectedUploader}
                                    handleCopyInvite={handleCopyInvite}
                                    filterAnchorEl={filterAnchorEl}
                                    handleFilterClose={handleFilterClose}
                                    handleSelectUploader={handleSelectUploader}
                                    viewFilter={viewFilter}
                                    handleViewFilterChange={setViewFilter}
                                    uniqueUploaders={uniqueUploaders}
                                    newLinkUrl={newLinkUrl}
                                    setNewLinkUrl={setNewLinkUrl}
                                    handlePostLink={handlePostLink}
                                    isPostingLink={isPostingLink}
                                    sortOrder={sortOrder}
                                    handleSortOrderChange={setSortOrder}
                                    isZenModeOpen={zenModeOpen}
                                    onToggleZenMode={() => toggleOverlay('zen', !zenModeOpen)}
                                />
                            </SocialErrorBoundary>

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
                                {viewMode === 'rooms' ? (
                                    <Box
                                        key="rooms-grid"
                                        component={motion.div}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
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
                                            position: 'relative'
                                        }}
                                    >
                                        <AnimatePresence>
                                            {effectiveIsLoadingRooms && (
                                                <Box
                                                    component={motion.div}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: -8,
                                                        left: 0,
                                                        right: 0,
                                                        height: 4,
                                                        zIndex: 10,
                                                        overflow: 'hidden',
                                                        borderRadius: '4px'
                                                    }}
                                                >
                                                    <LinearProgress />
                                                </Box>
                                            )}
                                        </AnimatePresence>

                                        {rooms.map((room, index) => (
                                            <SocialErrorBoundary key={room._id} componentName="Room Card">
                                                <RoomCard
                                                    room={room}
                                                    onSelect={() => handleSelectRoom(room._id)}
                                                    index={index}
                                                />
                                            </SocialErrorBoundary>
                                        ))}

                                        {!isInitializing && (
                                            <CreateRoomCard
                                                onClick={() => toggleOverlay('createRoom', true)}
                                                index={rooms.length}
                                            />
                                        )}
                                    </Box>
                                ) : (
                                    <Box
                                        key="room-content"
                                        sx={{ display: 'flex', gap: 2, height: '100%' }}
                                    >
                                        {/* Progressive Loading: Render lightweight skeleton until header animation starts */}
                                        {shouldRenderContent ? (
                                            <>
                                                <SocialErrorBoundary componentName="Sidebar">
                                                    <SocialSidebar
                                                        isMobile={isMobile}
                                                        mobileDrawerOpen={mobileDrawerOpen}
                                                        setMobileDrawerOpen={setMobileDrawerOpen}
                                                        collections={collections}
                                                        selectCollection={handleSelectCollection}
                                                        currentCollectionId={currentCollectionId}
                                                        handleCollectionContextMenu={handleCollectionContextMenu}
                                                        handleCollectionTouchStart={handleCollectionTouchStart}
                                                        handleCollectionTouchEnd={handleCollectionTouchEnd}
                                                        isLoadingContent={effectiveIsLoadingContent}
                                                        dropTargetId={dropTargetId}
                                                        setDropTargetId={setDropTargetId}
                                                        handleDrop={handleDrop}
                                                        getUnviewedCountByCollection={getUnviewedCountByCollection}
                                                        setShowCollectionDialog={() => toggleOverlay('createCol', true)}
                                                    />
                                                </SocialErrorBoundary>

                                                <SocialErrorBoundary componentName="Links Container">
                                                    <LinksContainer
                                                        linksContainerRef={linksContainerRef}
                                                        isMobile={isMobile}
                                                        currentCollectionId={currentCollectionId}
                                                        collections={collections}
                                                        setMobileDrawerOpen={setMobileDrawerOpen}
                                                        searchQuery={searchQuery}
                                                        setSearchQuery={setSearchQuery}
                                                        isLoadingContent={effectiveIsLoadingContent}
                                                        isLoadingLinks={isLoadingLinks}
                                                        isSearchingLinks={isSearchingLinks}
                                                        filteredLinks={filteredLinks}
                                                        deleteLink={handleDeleteLink}
                                                        setDraggedLinkId={setDraggedLinkId}
                                                        markLinkViewed={markLinkViewed}
                                                        unmarkLinkViewed={unmarkLinkViewed}
                                                        setCommentsLink={(link) => toggleOverlay('comments', link?._id || null)}
                                                        setReaderLink={(link) => toggleOverlay('reader', link?._id || null)}
                                                        previewLinkId={previewLink?._id || null}
                                                        setPreviewLink={(link) => toggleOverlay('preview', link?._id || null)}
                                                        viewedLinkIds={viewedLinkIds}
                                                        commentCounts={commentCounts}
                                                        currentUserId={currentUserId}
                                                        hasMoreLinks={hasMoreLinks}
                                                        loadAllLinks={loadAllLinks}
                                                        onMoveLink={handleOpenMoveDialog}
                                                    />
                                                </SocialErrorBoundary>
                                            </>
                                        ) : (
                                            // Layout Placeholder during the 50ms transition window
                                            // This prevents the header from jumping if layout changes
                                            <Box sx={{ flex: 1 }} />
                                        )}
                                    </Box>
                                )}

                                {/* Create Room Dialog */}
                                <CreateRoomDialog
                                    open={showCreateDialog}
                                    onClose={() => toggleOverlay('createRoom', null)}
                                    onSubmit={handleCreateRoom}
                                    isLoading={isCreating}
                                />

                                {/* Create Collection Dialog */}
                                <CreateCollectionDialog
                                    open={showCollectionDialog}
                                    onClose={() => toggleOverlay('createCol', null)}
                                    onSubmit={handleCreateCollection}
                                    isLoading={isCreatingCollection}
                                />

                                {/* Post Link Dialog */}
                                <PostLinkDialog
                                    open={showPostLinkDialog}
                                    onClose={() => {
                                        toggleOverlay('post', null);
                                        setPostLinkError(null);
                                    }}
                                    onSubmit={handlePostLink}
                                    isLoading={isPostingLink}
                                    error={postLinkError}
                                />

                                {/* Move Link Dialog */}
                                <MoveLinkDialog
                                    open={showMoveDialog}
                                    onClose={() => {
                                        toggleOverlay('move', null);
                                        setLinkToMove(null);
                                    }}
                                    onSubmit={handleMoveLink}
                                    collections={collections}
                                    currentCollectionId={linkToMove?.collectionId || null}
                                    isLoading={isMovingLink}
                                />

                                {/* Mobile FAB */}
                                {
                                    isMobile && viewMode === 'room-content' && currentRoom && (
                                        <Fab
                                            color="primary"
                                            aria-label="add link"
                                            onClick={() => toggleOverlay('post', true)}
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
                                    message="Are you sure you want to delete this collection? All links in this collection will be permanently deleted."
                                    confirmText="Delete"
                                    onConfirm={handleDeleteCollection}
                                    onCancel={() => {
                                        setDeleteConfirmOpen(false);
                                        setCollectionToDelete(null);
                                    }}
                                    isLoading={isDeletingCollection}
                                    variant="danger"
                                />
                            </Box>
                        </Box>
                    )}
                </AnimatePresence>

                {/* Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    sx={{ zIndex: SOCIAL_SNACKBAR_Z_INDEX }}
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
                            link={commentsLink}
                            onClose={() => toggleOverlay('comments', null)}
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

                {/* Reader Mode Overlay */}
                {
                    readerLink && currentRoom && (
                        <ReaderModeOverlay
                            open={!!readerLink}
                            link={readerLink}
                            onClose={() => toggleOverlay('reader', null)}
                            currentUserId={currentUserId}
                            encryptAnnotation={async (text) => {
                                if (!currentRoom) throw new Error('No room selected');
                                const roomKey = roomKeys.get(currentRoom._id);
                                if (!roomKey) throw new Error('Room key not available');
                                return encryptWithAES(roomKey, text);
                            }}
                            decryptAnnotation={async (encrypted) => {
                                if (!currentRoom) throw new Error('No room selected');
                                const roomKey = roomKeys.get(currentRoom._id);
                                if (!roomKey) throw new Error('Room key not available');
                                return decryptWithAES(roomKey, encrypted);
                            }}
                        />
                    )
                }

                {/* Zen Mode Overlay */}
                <ZenModeOverlay
                    open={zenModeOpen}
                    onClose={() => toggleOverlay('zen', null)}
                    collections={collections}
                    currentCollectionId={currentCollectionId}
                    selectCollection={handleSelectCollection}
                    linksContainerRef={linksContainerRef}
                    isMobile={isMobile}
                    effectiveIsLoadingContent={effectiveIsLoadingContent}
                    isLoadingLinks={isLoadingLinks}
                    isSearchingLinks={isSearchingLinks}
                    filteredLinks={filteredLinks}
                    handleDeleteLink={handleDeleteLink}
                    setDraggedLinkId={setDraggedLinkId}
                    markLinkViewed={markLinkViewed}
                    unmarkLinkViewed={unmarkLinkViewed}
                    toggleOverlay={toggleOverlay}
                    previewLink={previewLink}
                    viewedLinkIds={viewedLinkIds}
                    commentCounts={commentCounts}
                    currentUserId={currentUserId}
                    hasMoreLinks={hasMoreLinks}
                    loadAllLinks={loadAllLinks}
                    handleOpenMoveDialog={handleOpenMoveDialog}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    viewFilter={viewFilter}
                    onViewFilterChange={setViewFilter}
                    selectedUploader={selectedUploader}
                    onSelectUploader={setSelectedUploader}
                    uniqueUploaders={uniqueUploaders}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />
            </Box>
        </Box>
    );
}

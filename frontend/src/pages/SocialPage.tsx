import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
    Box,
    Typography,
    alpha,
    useTheme,
    CircularProgress,
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
        }))
    );

    // Consolidated Actions Selector
    const {
        fetchRooms,
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
    const viewMode = roomId ? 'room-content' : 'rooms';

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

    // Hot Share Listener: Listen for AEGIS_SHARE_INTENT events from browser extension
    useEffect(() => {
        const handleShareIntent = (event: CustomEvent<{ url: string }>) => {
            const { url } = event.detail;
            if (!url) return;

            if (currentRoom) {
                // Room is active, open the dialog immediately
                setNewLinkUrl(url);
                setShowPostLinkDialog(true);
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
    }, [currentRoom]);

    // Cold Share Logic: Check for share_url query parameter on load
    useEffect(() => {
        const shareUrl = searchParams.get('share_url');
        if (shareUrl) {
            // Clean the URL to prevent re-triggering on refresh
            searchParams.delete('share_url');
            setSearchParams(searchParams, { replace: true });

            if (currentRoom) {
                // Room is already active (e.g., via deep link), open dialog immediately
                setNewLinkUrl(shareUrl);
                setShowPostLinkDialog(true);
            } else {
                // Save for when user enters a room
                setPendingShareUrl(shareUrl);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Room Entry Logic: Open dialog when user enters a room with pending share URL
    useEffect(() => {
        if (currentRoom && pendingShareUrl) {
            setNewLinkUrl(pendingShareUrl);
            setShowPostLinkDialog(true);
            setPendingShareUrl(null);
        }
    }, [currentRoom, pendingShareUrl]);

    // Fetch rooms on mount
    useEffect(() => {
        if (pqcEngineStatus === 'operational') {
            fetchRooms();
        }
    }, [pqcEngineStatus, fetchRooms]);

    // Load room if roomId in URL
    // Clear error when returning to rooms list
    useEffect(() => {
        if (!roomId && error) {
            clearError();
        }
    }, [roomId, error, clearError]);

    useEffect(() => {
        if (roomId && pqcEngineStatus === 'operational') {
            selectRoom(roomId);
        }
    }, [roomId, pqcEngineStatus, selectRoom]);

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

    const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    };

    // Exit room and return to rooms view
    const handleExitRoom = useCallback(() => {
        setOptimisticRoomId(null);
        clearError();
        navigate('/dashboard/social');
    }, [navigate, clearError]);

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
            setShowCreateDialog(false);
            showSnackbar('Room created with end-to-end encryption', 'success');
            // Navigate to new room
            handleSelectRoom(room._id);
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
            setPostLinkError(null);
            await postLink(linkToPost.trim());
            setNewLinkUrl('');
            setShowPostLinkDialog(false);
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
    };

    const handleCreateCollection = useCallback(async (name: string) => {
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
            setShowMoveDialog(false);
            setLinkToMove(null);
            showSnackbar('Link moved successfully', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to move link', 'error');
        } finally {
            setIsMovingLink(false);
        }
    }, [linkToMove, isMovingLink, moveLink, showSnackbar]);

    const handleOpenMoveDialog = useCallback((link: LinkPost) => {
        setLinkToMove(link);
        setShowMoveDialog(true);
    }, []);

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
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
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
                                    getUniqueUploaders={getUniqueUploaders}
                                    newLinkUrl={newLinkUrl}
                                    setNewLinkUrl={setNewLinkUrl}
                                    handlePostLink={handlePostLink}
                                    isPostingLink={isPostingLink}
                                    sortOrder={sortOrder}
                                    handleSortOrderChange={setSortOrder}
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
                                        transition={{ duration: 0.3 }}
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
                                        }}
                                    >
                                        {isLoadingRooms ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gridColumn: '1 / -1' }}>
                                                <CircularProgress />
                                            </Box>
                                        ) : (
                                            <>
                                                {rooms.map((room, index) => (
                                                    <SocialErrorBoundary key={room._id} componentName="Room Card">
                                                        <RoomCard
                                                            room={room}
                                                            onSelect={() => handleSelectRoom(room._id)}
                                                            index={index}
                                                        />
                                                    </SocialErrorBoundary>
                                                ))}
                                                <CreateRoomCard 
                                                    onClick={() => setShowCreateDialog(true)} 
                                                    index={rooms.length}
                                                />
                                            </>
                                        )}
                                    </Box>
                                ) : (
                                    <Box
                                        key="room-content"
                                        sx={{ display: 'flex', gap: 2, height: '100%' }}
                                    >
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
                                                isLoadingContent={isLoadingContent}
                                                dropTargetId={dropTargetId}
                                                setDropTargetId={setDropTargetId}
                                                handleDrop={handleDrop}
                                                getUnviewedCountByCollection={getUnviewedCountByCollection}
                                                setShowCollectionDialog={setShowCollectionDialog}
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
                                                isLoadingContent={isLoadingContent}
                                                isLoadingLinks={isLoadingLinks}
                                                filteredLinks={filteredLinks}
                                                deleteLink={handleDeleteLink}
                                                setDraggedLinkId={setDraggedLinkId}
                                                markLinkViewed={markLinkViewed}
                                                unmarkLinkViewed={unmarkLinkViewed}
                                                setCommentsLink={setCommentsLink}
                                                viewedLinkIds={viewedLinkIds}
                                                commentCounts={commentCounts}
                                                currentUserId={currentUserId}
                                                hasMoreLinks={hasMoreLinks}
                                                loadAllLinks={loadAllLinks}
                                                onMoveLink={handleOpenMoveDialog}
                                            />
                                        </SocialErrorBoundary>
                                    </Box>
                                )}
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
                                onClose={() => {
                                    setShowPostLinkDialog(false);
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
                                    setShowMoveDialog(false);
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
                            onClose={() => setCommentsLink(null)}
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

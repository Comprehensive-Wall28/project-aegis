import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SocialState } from './useSocialState';
import socketService from '@/services/socketService';
import { useShareIntent } from './useShareIntent';
import { decryptWithAES } from '@/utils/socialCrypto';

export function useSocialHandlers(state: SocialState) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const {
        currentRoom,
        selectCollection,
        createRoom,
        postLink,
        deleteLink,
        createCollection,
        deleteCollection,
        moveLink,
        createInvite,
        clearRoomContent,
        clearError,
        searchRoomLinks,
        currentCollectionId,
        links,
        viewedLinkIds,
        sortOrder,
        viewFilter,
        searchQuery,
        roomId,
        pqcEngineStatus,
        setOptimisticRoomId,
        setSnackbar,
        setPostLinkError,
        setIsPostingLink,
        setNewLinkUrl,
        setFilterAnchorEl,
        setSelectedUploader,
        toggleOverlay,
        setIsCreating,
        setIsCreatingCollection,
        setPendingShareUrl,
        setIsMovingLink,
        setDraggedLinkId,
        setDropTargetId,
        setDeleteConfirmOpen,
        setIsDeletingCollection,
        setCollectionToDelete,
        newLinkUrl,
        isCreatingCollection,
        isMovingLink,
        linkToMove,
        zenModeOpen,
        collectionToDelete,
        draggedLinkId,
        error
    } = state;

    const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info') => {
        setSnackbar({ open: true, message, severity });
    }, [setSnackbar]);

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
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const message = err.response?.data?.message || err.message || 'Failed to post link';
            setPostLinkError(message);
            showSnackbar(message, 'error');
        } finally {
            setIsPostingLink(false);
        }
    }, [newLinkUrl, postLink, showSnackbar, toggleOverlay, setIsPostingLink, setPostLinkError, setNewLinkUrl]);

    const handleExitRoom = useCallback(() => {
        setOptimisticRoomId(null);
        clearError();
        clearRoomContent();
        navigate('/dashboard/social');
    }, [navigate, clearError, clearRoomContent, setOptimisticRoomId]);

    const handleSelectRoom = useCallback(async (selectedRoomId: string) => {
        setOptimisticRoomId(selectedRoomId);
        navigate(`/dashboard/social/${selectedRoomId}`);
    }, [navigate, setOptimisticRoomId]);

    const handleSelectCollection = useCallback((id: string) => {
        // We only call selectCollection if it's different to avoid redundant fetches
        if (id !== currentCollectionId) {
            selectCollection(id);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('c', id);
            setSearchParams(newParams, { replace: true });
        }
    }, [selectCollection, searchParams, setSearchParams, currentCollectionId]);

    const handleCreateRoom = useCallback(async (name: string, description: string) => {
        try {
            setIsCreating(true);
            const room = await createRoom(name, description);
            toggleOverlay('createRoom', null);
            showSnackbar('Room created successfully', 'success');
            handleSelectRoom(room._id);
        } catch (error: unknown) {
            const err = error as { message?: string };
            showSnackbar(err.message || 'Failed to create room', 'error');
        } finally {
            setIsCreating(false);
        }
    }, [createRoom, toggleOverlay, showSnackbar, handleSelectRoom, setIsCreating]);

    const handleCreateCollection = useCallback(async (name: string) => {
        if (!name.trim() || isCreatingCollection) return;

        setIsCreatingCollection(true);
        try {
            await createCollection(name.trim());
            toggleOverlay('createCol', null);
            showSnackbar('Collection created successfully', 'success');
        } catch (error: unknown) {
            const err = error as { message?: string };
            showSnackbar(err.message || 'Failed to create collection', 'error');
        } finally {
            setIsCreatingCollection(false);
        }
    }, [isCreatingCollection, createCollection, showSnackbar, toggleOverlay, setIsCreatingCollection]);

    const handleDrop = useCallback(async (collectionId: string) => {
        if (!draggedLinkId) return;

        const linkToMove = links.find(l => l._id === draggedLinkId);
        if (linkToMove && linkToMove.collectionId !== collectionId) {
            try {
                await moveLink(draggedLinkId, collectionId);
                showSnackbar('Link moved successfully', 'success');
            } catch (error: unknown) {
                const err = error as { message?: string };
                showSnackbar(err.message || 'Failed to move link', 'error');
            }
        }

        setDraggedLinkId(null);
        setDropTargetId(null);
    }, [draggedLinkId, links, moveLink, showSnackbar, setDraggedLinkId, setDropTargetId]);

    const handleMoveLink = useCallback(async (collectionId: string) => {
        if (!linkToMove || isMovingLink) return;

        setIsMovingLink(true);
        try {
            await moveLink(linkToMove._id, collectionId);
            toggleOverlay('move', null);
            showSnackbar('Link moved successfully', 'success');
        } catch (error: unknown) {
            const err = error as { message?: string };
            showSnackbar(err.message || 'Failed to move link', 'error');
        } finally {
            setIsMovingLink(false);
        }
    }, [linkToMove, isMovingLink, moveLink, showSnackbar, toggleOverlay, setIsMovingLink]);

    const handleDeleteCollection = useCallback(async () => {
        if (!collectionToDelete) return;
        setIsDeletingCollection(true);

        try {
            await deleteCollection(collectionToDelete);
            showSnackbar('Collection deleted', 'success');
        } catch (error: unknown) {
            const err = error as { message?: string };
            showSnackbar(err.message || 'Failed to delete collection', 'error');
        }
        setIsDeletingCollection(false);
        setDeleteConfirmOpen(false);
        setCollectionToDelete(null);
    }, [collectionToDelete, deleteCollection, showSnackbar, setIsDeletingCollection, setDeleteConfirmOpen, setCollectionToDelete]);

    const handleDeleteLink = useCallback(async (linkId: string) => {
        try {
            await deleteLink(linkId);
            showSnackbar('Link deleted successfully', 'success');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const message = err.response?.data?.message || err.message || 'Failed to delete link';
            showSnackbar(message, 'error');
        }
    }, [deleteLink, showSnackbar]);

    const handleCopyInvite = useCallback(async () => {
        if (!currentRoom) return;

        try {
            const inviteUrl = await createInvite(currentRoom._id);
            await navigator.clipboard.writeText(inviteUrl);
            showSnackbar('Invite link copied to clipboard', 'success');
        } catch (error: unknown) {
            const err = error as { message?: string };
            showSnackbar(err.message || 'Failed to create invite', 'error');
        }
    }, [currentRoom, createInvite, showSnackbar]);

    // Derived State
    const filteredLinks = useMemo(() => {
        let filtered = links;

        if (state.selectedUploader) {
            filtered = filtered.filter((l) => {
                const userId = typeof l.userId === 'object' && l.userId ? (l.userId as { _id: string })._id : null;
                return userId === state.selectedUploader;
            });
        }

        if (viewFilter !== 'all') {
            filtered = filtered.filter((l) => {
                const isViewed = viewedLinkIds.has(l._id);
                return viewFilter === 'viewed' ? isViewed : !isViewed;
            });
        }

        return [...filtered].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
        });
    }, [links, state.selectedUploader, viewFilter, viewedLinkIds, sortOrder]);

    const uniqueUploaders = useMemo(() => {
        const uploaders = new Map<string, string>();
        links.forEach(link => {
            if (typeof link.userId === 'object') {
                uploaders.set(link.userId._id, link.userId.username);
            }
        });
        return Array.from(uploaders.entries()).map(([id, username]) => ({ id, username }));
    }, [links]);

    // Effects
    useEffect(() => {
        const activeRoomId = currentRoom?._id;
        return () => {
            if (activeRoomId) {
                socketService.leaveRoom(activeRoomId);
            }
        };
    }, [currentRoom?._id]);

    useEffect(() => {
        return () => {
            clearRoomContent();
        };
    }, [clearRoomContent]);

    useEffect(() => {
        if (pqcEngineStatus === 'operational') {
            state.fetchRooms();
        }
    }, [pqcEngineStatus]);

    useEffect(() => {
        if (state.viewMode === 'room-content') {
            state.setShouldRenderContent(false);
            const timer = setTimeout(() => {
                state.setShouldRenderContent(true);
            }, 120);
            return () => clearTimeout(timer);
        } else {
            state.setShouldRenderContent(false);
        }
    }, [state.viewMode, roomId]);

    useEffect(() => {
        if (!roomId) {
            setOptimisticRoomId(null);
            clearRoomContent();
            if (error) clearError();
        }
    }, [roomId, clearRoomContent, clearError, error, setOptimisticRoomId]);

    useEffect(() => {
        if (roomId && pqcEngineStatus === 'operational') {
            const initialCollectionId = searchParams.get('c') || undefined;
            state.selectRoom(roomId, initialCollectionId).then((selectedCollectionId) => {
                // If we didn't have an initial collection ID in the URL, but one was selected
                // (e.g. the default collection), update the URL to match
                if (!initialCollectionId && selectedCollectionId && selectedCollectionId !== initialCollectionId) {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('c', selectedCollectionId);
                    setSearchParams(newParams, { replace: true });
                }
            });
        }
    }, [roomId, pqcEngineStatus]);

    const prevSearchQueryRef = useRef(searchQuery);
    useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            const timer = setTimeout(() => {
                searchRoomLinks(searchQuery.trim());
            }, 400);
            return () => clearTimeout(timer);
        } else if (searchQuery.trim().length === 0 && prevSearchQueryRef.current.trim().length > 0 && currentCollectionId) {
            // Revert back to collection view ONLY when clearing an active search
            selectCollection(currentCollectionId, false);
        }
        prevSearchQueryRef.current = searchQuery;
    }, [searchQuery, searchRoomLinks, currentCollectionId, selectCollection]);

    // Share intent integration
    useShareIntent({
        currentRoom,
        handlePostLink,
        setPendingShareUrl,
        showSnackbar
    });

    const handleFilterClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
        setFilterAnchorEl(event.currentTarget);
    }, [setFilterAnchorEl]);

    const handleFilterClose = useCallback(() => {
        setFilterAnchorEl(null);
    }, [setFilterAnchorEl]);

    const handleSelectUploader = useCallback((uploaderId: string | null) => {
        setSelectedUploader(uploaderId);
        handleFilterClose();
    }, [setSelectedUploader, handleFilterClose]);

    const decryptAction = useCallback(async (encryptedData: string, key: CryptoKey) => {
        return decryptWithAES(key, encryptedData);
    }, []);

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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

    const handleOpenMoveDialog = useCallback((link: { _id: string }) => {
        toggleOverlay('move', link._id);
    }, [toggleOverlay]);

    const handleCollectionContextMenu = useCallback((event: React.MouseEvent, collectionId: string) => {
        event.preventDefault();
        event.stopPropagation();
        state.setCollectionContextMenu({
            mouseX: event.clientX,
            mouseY: event.clientY,
            collectionId,
        });
    }, [state.setCollectionContextMenu]);

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleCollectionTouchStart = useCallback((collectionId: string) => {
        longPressTimerRef.current = setTimeout(() => {
            state.setCollectionToDelete(collectionId);
            state.setDeleteConfirmOpen(true);
        }, 600);
    }, [state.setCollectionToDelete, state.setDeleteConfirmOpen]);

    const handleCollectionTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    return {
        handlePostLink,
        handleExitRoom,
        handleSelectRoom,
        handleSelectCollection,
        handleCreateRoom,
        handleCreateCollection,
        handleDrop,
        handleMoveLink,
        handleDeleteCollection,
        handleDeleteLink,
        handleCopyInvite,
        handleOpenMoveDialog,
        handleCollectionContextMenu,
        handleCollectionTouchStart,
        handleCollectionTouchEnd,
        handleFilterClick,
        handleFilterClose,
        handleSelectUploader,
        decryptWithAES: decryptAction,
        filteredLinks,
        uniqueUploaders,
        showSnackbar
    };
}

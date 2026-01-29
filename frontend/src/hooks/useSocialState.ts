import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMediaQuery, useTheme } from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocialStore } from '@/stores/useSocialStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useSocialUrlSync } from './useSocialUrlSync';

export function useSocialState() {
    const theme = useTheme();
    const { roomId } = useParams<{ roomId?: string }>();
    const [searchParams] = useSearchParams();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const currentUserId = useSessionStore((state) => state.user?._id);

    // Store state & actions
    const store = useSocialStore(
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
            linksCache: state.linksCache,

            // Actions
            fetchRooms: state.fetchRooms,
            clearError: state.clearError,
            selectRoom: state.selectRoom,
            selectCollection: state.selectCollection,
            createRoom: state.createRoom,
            postLink: state.postLink,
            deleteLink: state.deleteLink,
            createCollection: state.createCollection,
            deleteCollection: state.deleteCollection,
            renameCollection: state.renameCollection,
            reorderCollections: state.reorderCollections,
            moveLink: state.moveLink,
            createInvite: state.createInvite,
            markLinkViewed: state.markLinkViewed,
            unmarkLinkViewed: state.unmarkLinkViewed,
            getUnviewedCountByCollection: state.getUnviewedCountByCollection,
            loadAllLinks: state.loadAllLinks,
            searchRoomLinks: state.searchRoomLinks,
            clearRoomContent: state.clearRoomContent,
            leaveRoom: state.leaveRoom,
            deleteRoom: state.deleteRoom,
        }))
    );

    // Local state
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
    const [isMovingLink, setIsMovingLink] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [postLinkError, setPostLinkError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info',
    });
    const [optimisticRoomId, setOptimisticRoomId] = useState<string | null>(null);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [pendingShareUrl, setPendingShareUrl] = useState<string | null>(null);

    // UI state for collections
    const [collectionContextMenu, setCollectionContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        collectionId: string;
    } | null>(null);
    const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isDeletingCollection, setIsDeletingCollection] = useState(false);
    const [isRenamingCollection, setIsRenamingCollection] = useState(false);
    const [collectionToRename, setCollectionToRename] = useState<string | null>(null);

    const [roomToLeave, setRoomToLeave] = useState<string | null>(null);
    const [leaveRoomConfirmOpen, setLeaveRoomConfirmOpen] = useState(false);
    const [isLeavingRoom, setIsLeavingRoom] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
    const [deleteRoomConfirmOpen, setDeleteRoomConfirmOpen] = useState(false);
    const [isDeletingRoom, setIsDeletingRoom] = useState(false);

    const [shouldRenderContent, setShouldRenderContent] = useState(false);

    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const viewMode = (optimisticRoomId || (roomId && (store.isLoadingContent || store.currentRoom))) ? 'room-content' : 'rooms';

    const urlSync = useSocialUrlSync(store.links);

    // Sync Collection from URL
    useEffect(() => {
        const collectionId = searchParams.get('c');
        if (collectionId && collectionId !== store.currentCollectionId) {
            store.selectCollection(collectionId);
        }
    }, [searchParams, store.currentCollectionId, store.selectCollection]);

    return {
        // Shared context & route info
        roomId,
        currentUserId,
        pqcEngineStatus,
        isMobile,
        viewMode,
        searchParams,

        // Store state & actions
        ...store,

        // Local state
        isCreating, setIsCreating,
        isCreatingCollection, setIsCreatingCollection,
        newLinkUrl, setNewLinkUrl,
        isPostingLink, setIsPostingLink,
        draggedLinkId, setDraggedLinkId,
        dropTargetId, setDropTargetId,
        filterAnchorEl, setFilterAnchorEl,
        selectedUploader, setSelectedUploader,
        viewFilter, setViewFilter,
        sortOrder, setSortOrder,
        isMovingLink, setIsMovingLink,
        searchQuery, setSearchQuery,
        postLinkError, setPostLinkError,
        snackbar, setSnackbar,
        optimisticRoomId, setOptimisticRoomId,
        mobileDrawerOpen, setMobileDrawerOpen,
        pendingShareUrl, setPendingShareUrl,
        collectionContextMenu, setCollectionContextMenu,
        collectionToDelete, setCollectionToDelete,
        deleteConfirmOpen, setDeleteConfirmOpen,
        isDeletingCollection, setIsDeletingCollection,
        isRenamingCollection, setIsRenamingCollection,
        collectionToRename, setCollectionToRename,
        roomToLeave, setRoomToLeave,
        leaveRoomConfirmOpen, setLeaveRoomConfirmOpen,
        isLeavingRoom, setIsLeavingRoom,
        roomToDelete, setRoomToDelete,
        deleteRoomConfirmOpen, setDeleteRoomConfirmOpen,
        isDeletingRoom, setIsDeletingRoom,
        shouldRenderContent, setShouldRenderContent,

        // Transition helpers
        isInitializing: pqcEngineStatus !== 'operational',
        effectiveIsLoadingRooms: store.isLoadingRooms || pqcEngineStatus !== 'operational',
        effectiveIsLoadingRoom: store.isLoadingContent || pqcEngineStatus !== 'operational' || !shouldRenderContent,
        effectiveIsLoadingLinks: store.isLoadingLinks || store.isSearchingLinks,
        // Only show skeletons during initial room load (isLoadingContent), not during collection switching
        // isLoadingLinks alone should NOT trigger skeletons - let the current content animate out naturally
        hasLoadedContent: Object.keys(store.linksCache).length > 0,
        effectiveIsLoadingContent: store.isLoadingContent || store.isSearchingLinks || pqcEngineStatus !== 'operational' || !shouldRenderContent,

        // Url Sync
        ...urlSync
    };
}

export type SocialState = ReturnType<typeof useSocialState>;

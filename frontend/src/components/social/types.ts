import type { Room, Collection, LinkPost } from '@/services/socialService';
export type { Room, Collection, LinkPost };

export interface SocialHeaderProps {
    viewMode: 'rooms' | 'room-content';
    isMobile: boolean;
    optimisticRoomId: string | null;
    currentRoom: Room | null;
    handleExitRoom: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleFilterClick: (event: React.MouseEvent<HTMLElement>) => void;
    selectedUploader: string | null;
    handleCopyInvite: () => void;
    filterAnchorEl: HTMLElement | null;
    handleFilterClose: () => void;
    handleSelectUploader: (id: string | null) => void;
    viewFilter: 'all' | 'viewed' | 'unviewed';
    handleViewFilterChange: (filter: 'all' | 'viewed' | 'unviewed') => void;
    uniqueUploaders: { id: string, username: string }[];
    handlePostLink: (url?: string) => void;
    isPostingLink: boolean;
    sortOrder: 'latest' | 'oldest';
    handleSortOrderChange: (order: 'latest' | 'oldest') => void;
    isLoadingLinks?: boolean;
    isSearchingLinks?: boolean;
    isZenModeOpen?: boolean;
    onToggleZenMode?: () => void;
    onCreateRoom?: () => void;
}

export interface CollectionItemProps {
    collection: Collection;
    isActive: boolean;
    isTarget: boolean;
    unviewedCount: number;
    isMobileView: boolean;
    onClick: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    onTouchStart: (id: string) => void;
    onTouchEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (id: string) => void;
}

export interface SocialSidebarProps {
    isMobile: boolean;
    mobileDrawerOpen: boolean;
    setMobileDrawerOpen: (open: boolean) => void;
    collections: Collection[];
    selectCollection: (id: string) => void;
    currentCollectionId: string | null;
    handleCollectionContextMenu: (event: React.MouseEvent, id: string) => void;
    handleCollectionTouchStart: (id: string) => void;
    handleCollectionTouchEnd: () => void;
    isLoadingContent: boolean;
    dropTargetId: string | null;
    setDropTargetId: (id: string | null) => void;
    handleDrop: (id: string) => void;
    getUnviewedCountByCollection: (id: string) => number;
    setShowCollectionDialog: (show: boolean) => void;
}

export interface LinksContainerProps {
    noContainer?: boolean;
    menuZIndex?: number;
}

export interface LinkCardProps {
    link: LinkPost;
    onCommentsClick?: (link: LinkPost) => void;
    onReaderClick?: (link: LinkPost) => void;
    onDelete?: (linkId: string) => void;
    onDragStart?: (linkId: string) => void;
    onView?: (linkId: string) => void;
    onUnview?: (linkId: string) => void;
    onPreviewClick?: (link: LinkPost | null) => void;
    showPreview?: boolean;
    isViewed?: boolean;
    commentCount?: number;
    canDelete?: boolean;
    onMoveClick?: (link: LinkPost) => void;
    highlight?: string;
    menuZIndex?: number;
}

export interface CommentsOverlayProps {
    open: boolean;
    onClose: () => void;
    link: LinkPost;
    encryptComment: (text: string) => Promise<string>;
    decryptComment: (encryptedText: string) => Promise<string>;
    currentUserId?: string;
}

export interface CreateRoomDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string) => void;
    isLoading: boolean;
}

export interface CreateCollectionDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
    isLoading: boolean;
}

export interface RenameCollectionDialogProps {
    open: boolean;
    collection: Collection | null;
    onClose: () => void;
    onSubmit: (name: string) => void;
    isLoading: boolean;
}

export interface PostLinkDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (url: string) => void;
    isLoading: boolean;
    error?: string | null;
}

export interface MoveLinkDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (collectionId: string) => void;
    collections: Collection[];
    currentCollectionId: string | null;
    isLoading: boolean;
}

export interface RoomCardProps {
    room: Room;
    onSelect: () => void;
    onLeave?: (e: React.MouseEvent) => void;
    index?: number;
}

export interface CreateRoomCardProps {
    onClick: () => void;
    index?: number;
}

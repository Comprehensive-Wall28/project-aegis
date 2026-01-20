import type { Room, Collection, LinkPost } from '@/services/socialService';

export interface RoomSlice {
    rooms: Room[];
    currentRoom: Room | null;
    isLoadingRooms: boolean;
    isLoadingContent: boolean;
    pendingInvite: {
        inviteCode: string;
        roomKey: CryptoKey;
        roomInfo: { name: string; description: string };
    } | null;
    error: string | null;

    fetchRooms: () => Promise<void>;
    selectRoom: (roomId: string) => Promise<void>;
    refreshCurrentRoom: () => Promise<void>;
    createRoom: (name: string, description: string, icon?: string) => Promise<Room>;
    joinRoom: (inviteCode: string, roomKey: CryptoKey) => Promise<void>;
    createInvite: (roomId: string) => Promise<string>;
    setPendingInvite: (invite: RoomSlice['pendingInvite']) => void;
    clearError: () => void;
    clearRoomContent: () => void;
}

export interface CollectionSlice {
    collections: Collection[];
    currentCollectionId: string | null;

    selectCollection: (collectionId: string, force?: boolean) => Promise<void>;
    createCollection: (name: string) => Promise<Collection>;
    deleteCollection: (collectionId: string) => Promise<void>;
    reorderCollections: (collectionIds: string[]) => Promise<void>;
}

export interface LinkSlice {
    links: LinkPost[];
    linksCache: Record<string, { links: LinkPost[]; hasMore: boolean }>;
    viewedLinkIds: Set<string>;
    commentCounts: Record<string, number>;
    unviewedCounts: Record<string, number>;
    isLoadingLinks: boolean;
    isSearchingLinks: boolean;
    hasMoreLinks: boolean;

    fetchCollectionLinks: (collectionId: string, isLoadMore?: boolean, silent?: boolean, limit?: number) => Promise<void>;
    loadMoreLinks: () => Promise<void>;
    loadAllLinks: () => Promise<void>;
    searchRoomLinks: (query: string, limit?: number) => Promise<void>;
    postLink: (url: string) => Promise<LinkPost>;
    deleteLink: (linkId: string) => Promise<void>;
    moveLink: (linkId: string, collectionId: string) => Promise<void>;
    markLinkViewed: (linkId: string) => Promise<void>;
    unmarkLinkViewed: (linkId: string) => Promise<void>;
    getUnviewedCountByCollection: (collectionId: string) => number;
}

export interface CryptoSlice {
    roomKeys: Map<string, CryptoKey>;

    decryptRoomMetadata: (room: Room) => Promise<{ name: string; description: string }>;
    decryptCollectionMetadata: (collection: Collection) => Promise<{ name: string }>;
}

export interface SocketSlice {
    socketListenersAttached: boolean;
    cleanupSocketListeners: () => void;
    setupSocketListeners: () => void;
}

// Combined State
export type SocialState = RoomSlice & CollectionSlice & LinkSlice & CryptoSlice & SocketSlice & {
    clearSocial: () => void;
};

import { create } from 'zustand';
import type { SocialState } from './social/types';
import { createRoomSlice } from './social/roomSlice';
import { createCollectionSlice } from './social/collectionSlice';
import { createLinkSlice } from './social/linkSlice';
import { createCryptoSlice } from './social/cryptoSlice';
import { createSocketSlice } from './social/socketHandler';
import socketService from '@/services/socketService';

export const useSocialStore = create<SocialState>()((...a) => ({
    ...createRoomSlice(...a),
    ...createCollectionSlice(...a),
    ...createLinkSlice(...a),
    ...createCryptoSlice(...a),
    ...createSocketSlice(...a),

    clearSocial: () => {
        const [set, get] = a;
        get().cleanupSocketListeners();
        socketService.disconnect();
        set({
            rooms: [],
            currentRoom: null,
            collections: [],
            currentCollectionId: null,
            links: [],
            viewedLinkIds: new Set(),
            commentCounts: {},
            unviewedCounts: {},
            isLoadingRooms: false,
            isLoadingContent: false,
            isLoadingLinks: false,
            hasMoreLinks: false,
            pendingInvite: null,
            roomKeys: new Map(),
            error: null,
            linksCache: {},
            socketListenersAttached: false,
        });
    },
}));

// Re-export crypto utilities for backward compatibility
export * from '@/utils/socialCrypto';

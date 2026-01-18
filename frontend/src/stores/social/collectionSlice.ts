import type { StateCreator } from 'zustand';
import type { SocialState } from './types';
import socialService, { type Collection } from '@/services/socialService';
import { useSessionStore } from '../sessionStore';
import { encryptWithAES } from '@/utils/socialCrypto';

export const createCollectionSlice: StateCreator<SocialState, [], [], Pick<SocialState, keyof import('./types').CollectionSlice>> = (set, get) => ({
    collections: [],
    currentCollectionId: null,

    selectCollection: async (collectionId: string) => {
        const state = get();
        if (state.currentCollectionId === collectionId) return;

        // Check cache
        const cached = state.linksCache[collectionId];
        if (cached) {
            set({
                currentCollectionId: collectionId,
                links: cached.links,
                hasMoreLinks: cached.hasMore,
            });
            return;
        }

        set({
            currentCollectionId: collectionId,
            links: [], // Clear existing links when switching
            hasMoreLinks: false
        });

        await get().fetchCollectionLinks(collectionId, false);
    },

    createCollection: async (name: string) => {
        const state = get();
        const { setCryptoStatus } = useSessionStore.getState();
        if (!state.currentRoom) throw new Error('No room selected');

        const roomKey = state.roomKeys.get(state.currentRoom._id);
        if (!roomKey) throw new Error('Room key not available');

        setCryptoStatus('encrypting');
        const encryptedName = await encryptWithAES(roomKey, name);
        setCryptoStatus('idle');

        const collection = await socialService.createCollection(
            state.currentRoom._id,
            encryptedName
        );

        set({ collections: [...state.collections, collection] });
        return collection;
    },

    deleteCollection: async (collectionId: string) => {
        await socialService.deleteCollection(collectionId);
        const state = get();

        const updatedCollections = state.collections.filter(c => c._id !== collectionId);
        const updatedLinks = state.links.filter(l => l.collectionId !== collectionId);

        const newCollectionId = state.currentCollectionId === collectionId
            ? (updatedCollections[0]?._id || null)
            : state.currentCollectionId;

        set({
            collections: updatedCollections,
            links: updatedLinks,
            currentCollectionId: newCollectionId,
        });
    },

    reorderCollections: async (collectionIds: string[]) => {
        const state = get();
        if (!state.currentRoom) return;

        const orderedCollections = collectionIds.map(id =>
            state.collections.find(c => c._id === id)
        ).filter(Boolean) as Collection[];

        set({ collections: orderedCollections });

        try {
            await socialService.reorderCollections(state.currentRoom._id, collectionIds);
        } catch (error) {
            console.error('Failed to reorder collections:', error);
        }
    },
});

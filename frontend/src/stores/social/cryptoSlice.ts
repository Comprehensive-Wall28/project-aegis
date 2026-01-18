import type { StateCreator } from 'zustand';
import type { SocialState } from './types';
import type { Room, Collection } from '@/services/socialService';
import { decryptWithAES } from '@/utils/socialCrypto';

export const createCryptoSlice: StateCreator<SocialState, [], [], Pick<SocialState, keyof import('./types').CryptoSlice>> = (_set, get) => ({
    roomKeys: new Map(),

    decryptRoomMetadata: async (room: Room) => {
        const state = get();
        const roomKey = state.roomKeys.get(room._id);

        if (!roomKey) {
            return { name: '[Encrypted]', description: '[Encrypted]' };
        }

        const name = await decryptWithAES(roomKey, room.name);
        const description = await decryptWithAES(roomKey, room.description);

        return { name, description };
    },

    decryptCollectionMetadata: async (collection: Collection) => {
        const state = get();
        if (!collection.name) return { name: collection.type === 'links' ? 'Links' : 'Collection' };

        const roomKey = state.roomKeys.get(collection.roomId);
        if (!roomKey) return { name: 'Encrypted Collection' };

        try {
            const name = await decryptWithAES(roomKey, collection.name);
            return { name };
        } catch {
            return { name: 'Decryption Failed' };
        }
    },
});

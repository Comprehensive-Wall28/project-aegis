import { create } from 'zustand';
import socialService from '@/services/socialService';
import type {
    Room,
    Collection,
    LinkPost,
    RoomContent,
} from '@/services/socialService';
import { useSessionStore } from './sessionStore';

// @ts-ignore - Module likely exists but types are missing in environment
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

interface SocialState {
    // Data
    rooms: Room[];
    currentRoom: Room | null;
    collections: Collection[];
    currentCollectionId: string | null;
    links: LinkPost[];
    viewedLinkIds: Set<string>;
    commentCounts: Record<string, number>;

    // Loading states
    isLoadingRooms: boolean;
    isLoadingContent: boolean;

    // Pending invite for join flow
    pendingInvite: {
        inviteCode: string;
        roomKey: CryptoKey;
        roomInfo: { name: string; description: string };
    } | null;

    // Room key cache (decrypted room keys)
    roomKeys: Map<string, CryptoKey>;

    // Actions
    fetchRooms: () => Promise<void>;

    selectRoom: (roomId: string) => Promise<void>;
    refreshCurrentRoom: () => Promise<void>;
    selectCollection: (collectionId: string) => void;
    createRoom: (name: string, description: string, icon?: string) => Promise<Room>;
    joinRoom: (inviteCode: string, roomKey: CryptoKey) => Promise<void>;
    postLink: (url: string) => Promise<LinkPost>;
    deleteLink: (linkId: string) => Promise<void>;
    createCollection: (name: string) => Promise<Collection>;
    deleteCollection: (collectionId: string) => Promise<void>;
    moveLink: (linkId: string, collectionId: string) => Promise<void>;
    markLinkViewed: (linkId: string) => Promise<void>;
    unmarkLinkViewed: (linkId: string) => Promise<void>;
    getUnviewedCountByCollection: (collectionId: string) => number;
    createInvite: (roomId: string) => Promise<string>;
    setPendingInvite: (invite: SocialState['pendingInvite']) => void;
    decryptRoomMetadata: (room: Room) => Promise<{ name: string; description: string }>;
    decryptCollectionMetadata: (collection: Collection) => Promise<{ name: string }>;
    clearSocial: () => void;
}

// Helper: Convert hex string to Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

// Helper: Convert Uint8Array to hex string
const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

// Generate random AES-256 key for room encryption
const generateRoomKey = async (): Promise<CryptoKey> => {
    return window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable for sharing
        ['encrypt', 'decrypt']
    );
};

// Encrypt data with AES-GCM key
export const encryptWithAES = async (key: CryptoKey, data: string): Promise<string> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
    );

    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
};

// Decrypt data with AES-GCM key
export const decryptWithAES = async (key: CryptoKey, encryptedData: string): Promise<string> => {
    try {
        const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        return '[Encrypted]';
    }
};

// Encrypt room key with user's PQC public key (ML-KEM encapsulation)
const encryptRoomKeyWithPQC = async (
    roomKey: CryptoKey,
    publicKeyHex: string
): Promise<string> => {
    const publicKey = hexToBytes(publicKeyHex);
    const rawKey = await window.crypto.subtle.exportKey('raw', roomKey);
    const rawKeyBytes = new Uint8Array(rawKey);

    // Use ML-KEM to encapsulate
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);

    // XOR the room key with the shared secret (first 32 bytes)
    const encryptedKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        encryptedKey[i] = rawKeyBytes[i] ^ sharedSecret[i];
    }

    // Combine ciphertext + encrypted key
    const combined = new Uint8Array(cipherText.length + encryptedKey.length);
    combined.set(cipherText);
    combined.set(encryptedKey, cipherText.length);

    return bytesToHex(combined);
};

// Decrypt room key with user's PQC private key (ML-KEM decapsulation)
const decryptRoomKeyWithPQC = async (
    encryptedRoomKey: string,
    privateKeyHex: string
): Promise<CryptoKey> => {
    const combined = hexToBytes(encryptedRoomKey);
    const privateKey = hexToBytes(privateKeyHex);

    // ML-KEM-768 ciphertext is 1088 bytes
    const cipherText = combined.slice(0, 1088);
    const encryptedKey = combined.slice(1088);

    // Decapsulate to get shared secret
    const sharedSecret = ml_kem768.decapsulate(cipherText, privateKey);

    // XOR to recover room key
    const rawKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        rawKey[i] = encryptedKey[i] ^ sharedSecret[i];
    }

    // Import as CryptoKey
    return window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

// Export room key as base64 for URL fragment
export const exportRoomKeyToBase64 = async (key: CryptoKey): Promise<string> => {
    const rawKey = await window.crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(rawKey)));
};

// Import room key from base64 URL fragment
export const importRoomKeyFromBase64 = async (base64Key: string): Promise<CryptoKey> => {
    const rawKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
    return window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

export const useSocialStore = create<SocialState>((set, get) => ({
    rooms: [],
    currentRoom: null,
    collections: [],
    currentCollectionId: null,
    links: [],
    viewedLinkIds: new Set(),
    commentCounts: {},
    isLoadingRooms: false,
    isLoadingContent: false,
    pendingInvite: null,
    roomKeys: new Map(),

    fetchRooms: async () => {
        set({ isLoadingRooms: true });
        try {
            const sessionUser = useSessionStore.getState().user;
            if (!sessionUser?.privateKey) {
                set({ isLoadingRooms: false });
                return;
            }

            const rooms = await socialService.getUserRooms();
            const state = get();

            // Decrypt room keys for each room
            for (const room of rooms) {
                if (room.encryptedRoomKey && !state.roomKeys.has(room._id)) {
                    try {
                        const roomKey = await decryptRoomKeyWithPQC(
                            room.encryptedRoomKey,
                            sessionUser.privateKey
                        );
                        state.roomKeys.set(room._id, roomKey);
                    } catch (err) {
                        console.error(`Failed to decrypt key for room ${room._id}:`, err);
                    }
                }
            }

            set({ rooms, isLoadingRooms: false });
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
            set({ isLoadingRooms: false });
        }
    },

    selectRoom: async (roomId: string) => {
        set({ isLoadingContent: true, currentCollectionId: null });
        try {
            const content: RoomContent = await socialService.getRoomContent(roomId);
            const state = get();
            const sessionUser = useSessionStore.getState().user;

            // Decrypt room key if we have one
            let roomKey: CryptoKey | undefined;
            if (content.room.encryptedRoomKey && sessionUser?.privateKey) {
                try {
                    roomKey = await decryptRoomKeyWithPQC(
                        content.room.encryptedRoomKey,
                        sessionUser.privateKey
                    );
                    state.roomKeys.set(roomId, roomKey);
                } catch (err) {
                    console.error('Failed to decrypt room key:', err);
                }
            }

            // Add room to list if not already present
            const existingRoom = state.rooms.find((r) => r._id === roomId);
            const updatedRooms = existingRoom
                ? state.rooms
                : [...state.rooms, content.room];

            set({
                currentRoom: content.room,
                collections: content.collections,
                links: content.links,
                viewedLinkIds: new Set(content.viewedLinkIds || []),
                commentCounts: content.commentCounts || {},
                rooms: updatedRooms,
                currentCollectionId: content.collections[0]?._id || null,
                isLoadingContent: false,
            });
        } catch (error) {
            console.error('Failed to select room:', error);
            set({ isLoadingContent: false });
        }
    },

    refreshCurrentRoom: async () => {
        const state = get();
        if (!state.currentRoom) return;

        try {
            const content: RoomContent = await socialService.getRoomContent(state.currentRoom._id);
            const sessionUser = useSessionStore.getState().user;

            // Note: We don't re-decrypt the room key here as we preserve existing keys
            // But we can decrypt any new room keys if somehow missing
            if (content.room.encryptedRoomKey && sessionUser?.privateKey && !state.roomKeys.has(state.currentRoom._id)) {
                try {
                    const roomKey = await decryptRoomKeyWithPQC(
                        content.room.encryptedRoomKey,
                        sessionUser.privateKey
                    );
                    state.roomKeys.set(state.currentRoom._id, roomKey);
                } catch (err) {
                    console.error('Failed to decrypt room key during refresh:', err);
                }
            }

            // Silent update of content
            set({
                // currentRoom: content.room, // Keep existing room obj to prevent full re-render flickering
                collections: content.collections,
                links: content.links,
                viewedLinkIds: new Set(content.viewedLinkIds || []),
                commentCounts: content.commentCounts || {},
                // Do NOT reset currentCollectionId or loading state
            });
        } catch (error) {
            console.error('Failed to refresh room:', error);
        }
    },

    selectCollection: (collectionId: string) => {
        set({ currentCollectionId: collectionId });
    },

    createRoom: async (name: string, description: string, icon?: string) => {
        const sessionUser = useSessionStore.getState().user;
        if (!sessionUser?.publicKey) {
            throw new Error('PQC keys not initialized');
        }

        // Generate room key
        const roomKey = await generateRoomKey();

        // Encrypt room metadata
        const encryptedName = await encryptWithAES(roomKey, name);
        const encryptedDescription = await encryptWithAES(roomKey, description);
        const encryptedIcon = icon ? await encryptWithAES(roomKey, icon) : '';

        // Encrypt room key with user's PQC public key
        const encryptedRoomKey = await encryptRoomKeyWithPQC(roomKey, sessionUser.publicKey);

        // Create room via API
        const room = await socialService.createRoom({
            name: encryptedName,
            description: encryptedDescription,
            icon: encryptedIcon,
            encryptedRoomKey,
        });

        // Cache room key and add to list
        const state = get();
        state.roomKeys.set(room._id, roomKey);

        set({
            rooms: [...state.rooms, room],
            currentRoom: room,
        });

        return room;
    },

    joinRoom: async (inviteCode: string, roomKey: CryptoKey) => {
        const sessionUser = useSessionStore.getState().user;
        if (!sessionUser?.publicKey) {
            throw new Error('PQC keys not initialized');
        }

        // Encrypt room key with user's PQC public key
        const encryptedRoomKey = await encryptRoomKeyWithPQC(roomKey, sessionUser.publicKey);

        // Join via API
        const result = await socialService.joinRoom(inviteCode, encryptedRoomKey);

        // Fetch room content
        await get().selectRoom(result.roomId);

        // Clear pending invite
        set({ pendingInvite: null });
    },

    postLink: async (url: string) => {
        const state = get();
        if (!state.currentRoom) {
            throw new Error('No room selected');
        }

        const linkPost = await socialService.postLink(
            state.currentRoom._id,
            url,
            state.currentCollectionId || undefined
        );

        set({ links: [linkPost, ...state.links] });
        return linkPost;
    },

    deleteLink: async (linkId: string) => {
        await socialService.deleteLink(linkId);
        const state = get();
        set({ links: state.links.filter(l => l._id !== linkId) });
    },

    createCollection: async (name: string) => {
        const state = get();
        if (!state.currentRoom) throw new Error('No room selected');

        const roomKey = state.roomKeys.get(state.currentRoom._id);
        if (!roomKey) throw new Error('Room key not available');

        // Encrypt collection name
        const encryptedName = await encryptWithAES(roomKey, name);

        const collection = await socialService.createCollection(
            state.currentRoom._id,
            encryptedName
        );

        set({ collections: [...state.collections, collection] });
        return collection;
    },

    moveLink: async (linkId: string, collectionId: string) => {
        await socialService.moveLink(linkId, collectionId);
        const state = get();

        // If the moved link is in the current view, update its collectionId or remove if filtered
        set({
            links: state.links.map(l =>
                l._id === linkId ? { ...l, collectionId: collectionId } : l
            )
        });
    },

    markLinkViewed: async (linkId: string) => {
        const state = get();

        // Optimistically update the UI
        const newViewedIds = new Set(state.viewedLinkIds);
        newViewedIds.add(linkId);
        set({ viewedLinkIds: newViewedIds });

        try {
            await socialService.markLinkViewed(linkId);
        } catch (error) {
            // Revert on error
            console.error('Failed to mark link as viewed:', error);
            newViewedIds.delete(linkId);
            set({ viewedLinkIds: new Set(newViewedIds) });
        }
    },

    unmarkLinkViewed: async (linkId: string) => {
        const state = get();

        // Optimistically update the UI
        const newViewedIds = new Set(state.viewedLinkIds);
        newViewedIds.delete(linkId);
        set({ viewedLinkIds: newViewedIds });

        try {
            await socialService.unmarkLinkViewed(linkId);
        } catch (error) {
            // Revert on error
            console.error('Failed to unmark link as viewed:', error);
            newViewedIds.add(linkId);
            set({ viewedLinkIds: new Set(newViewedIds) });
        }
    },

    getUnviewedCountByCollection: (collectionId: string) => {
        const state = get();
        return state.links.filter(
            l => l.collectionId === collectionId && !state.viewedLinkIds.has(l._id)
        ).length;
    },

    deleteCollection: async (collectionId: string) => {
        await socialService.deleteCollection(collectionId);
        const state = get();

        // Remove collection from list
        const updatedCollections = state.collections.filter(c => c._id !== collectionId);

        // Remove links in that collection
        const updatedLinks = state.links.filter(l => l.collectionId !== collectionId);

        // If the deleted collection was selected, select the first available or null
        const newCollectionId = state.currentCollectionId === collectionId
            ? (updatedCollections[0]?._id || null)
            : state.currentCollectionId;

        set({
            collections: updatedCollections,
            links: updatedLinks,
            currentCollectionId: newCollectionId,
        });
    },

    createInvite: async (roomId: string) => {
        const state = get();
        const roomKey = state.roomKeys.get(roomId);

        if (!roomKey) {
            throw new Error('Room key not available');
        }

        // Create invite code via API
        const { inviteCode } = await socialService.createInvite(roomId);

        // Export room key as base64 for URL fragment
        const keyBase64 = await exportRoomKeyToBase64(roomKey);

        // Build full invite URL
        const baseUrl = window.location.origin;
        const inviteUrl = `${baseUrl}/invite/${inviteCode}#${keyBase64}`;

        return inviteUrl;
    },

    setPendingInvite: (invite) => {
        set({ pendingInvite: invite });
    },

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

    clearSocial: () => {
        set({
            rooms: [],
            currentRoom: null,
            collections: [],
            currentCollectionId: null,
            links: [],
            viewedLinkIds: new Set(),
            commentCounts: {},
            pendingInvite: null,
            roomKeys: new Map(),
        });
    },
}));

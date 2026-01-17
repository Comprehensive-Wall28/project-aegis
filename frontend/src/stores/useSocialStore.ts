import { create } from 'zustand';
import socialService from '@/services/socialService';
import type {
    Room,
    Collection,
    LinkPost,
    RoomContent,
} from '@/services/socialService';
import { useSessionStore } from './sessionStore';
import socketService from '@/services/socketService';

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
    unviewedCounts: Record<string, number>;
    error: string | null;

    // Loading states
    isLoadingRooms: boolean;
    isLoadingContent: boolean;
    isLoadingLinks: boolean;

    // Pagination state
    hasMoreLinks: boolean;

    // Pending invite for join flow
    pendingInvite: {
        inviteCode: string;
        roomKey: CryptoKey;
        roomInfo: { name: string; description: string };
    } | null;

    // Room key cache (decrypted room keys)
    roomKeys: Map<string, CryptoKey>;

    // Collection Content Cache
    linksCache: Record<string, { links: LinkPost[]; hasMore: boolean }>;

    // Actions
    fetchRooms: () => Promise<void>;

    selectRoom: (roomId: string) => Promise<void>;
    refreshCurrentRoom: () => Promise<void>;
    selectCollection: (collectionId: string) => Promise<void>;
    fetchCollectionLinks: (collectionId: string, isLoadMore?: boolean, silent?: boolean) => Promise<void>;
    loadMoreLinks: () => Promise<void>;
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
    clearError: () => void;
    clearSocial: () => void;
    // Real-time setup
    setupSocketListeners: () => void;
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
    isLoadingLinks: false,
    hasMoreLinks: false,
    unviewedCounts: {},
    error: null,
    pendingInvite: null,
    roomKeys: new Map(),
    linksCache: {},

    fetchRooms: async () => {
        set({ isLoadingRooms: true });
        const { setCryptoStatus } = useSessionStore.getState();
        try {
            const sessionUser = useSessionStore.getState().user;
            if (!sessionUser?.privateKey) {
                set({ isLoadingRooms: false });
                return;
            }

            const rooms = await socialService.getUserRooms();
            set({ rooms, isLoadingRooms: false });

            // Proactive Background Decryption (Phase 3)
            // Decrypt keys as soon as we land on /social to make room entry instant
            const state = get();
            const roomsToDecrypt = rooms.filter(r => r.encryptedRoomKey && !state.roomKeys.has(r._id));

            if (roomsToDecrypt.length > 0) {
                // Run in background to avoid blocking initial render
                setTimeout(async () => {
                    const sessionUser = useSessionStore.getState().user;
                    if (!sessionUser?.privateKey) return;

                    setCryptoStatus('decrypting');
                    for (const room of roomsToDecrypt) {
                        if (!room.encryptedRoomKey) continue;
                        try {
                            const roomKey = await decryptRoomKeyWithPQC(
                                room.encryptedRoomKey,
                                sessionUser.privateKey
                            );

                            // We use a new Map to ensure reactiveness in components listening to roomKeys
                            set((prev) => {
                                const updatedKeys = new Map(prev.roomKeys);
                                updatedKeys.set(room._id, roomKey);
                                return { roomKeys: updatedKeys };
                            });
                        } catch (err) {
                            console.error(`Failed to background decrypt key for room ${room._id}:`, err);
                        }
                    }
                    setCryptoStatus('idle');
                }, 100); // Small delay to let initial UI settle
            }
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
            setCryptoStatus('idle');
            set({ isLoadingRooms: false, error: 'Failed to load rooms. Please refresh.' });
        }
    },

    selectRoom: async (roomId: string) => {
        const state = get();
        // Skip if already loading this room
        if (state.isLoadingContent && state.currentRoom?._id === roomId) return;

        set({
            isLoadingContent: true,
            error: null
            // We NO LONGER clear currentCollectionId or links immediately 
            // to allow for a smoother transition if the UI handles it,
            // or just to avoid extra state updates before the new data arrives
        });
        const { setCryptoStatus } = useSessionStore.getState();
        try {
            const content: RoomContent = await socialService.getRoomContent(roomId);
            const state = get();
            const sessionUser = useSessionStore.getState().user;

            // Decrypt room key if we have one
            let roomKey: CryptoKey | undefined;
            if (content.room.encryptedRoomKey && sessionUser?.privateKey) {
                try {
                    setCryptoStatus('decrypting');
                    roomKey = await decryptRoomKeyWithPQC(
                        content.room.encryptedRoomKey,
                        sessionUser.privateKey
                    );
                    state.roomKeys.set(roomId, roomKey);
                    setCryptoStatus('idle');
                } catch (err) {
                    console.error('Failed to decrypt room key:', err);
                    setCryptoStatus('idle');
                }
            }

            // Add room to list if not already present
            const existingRoom = state.rooms.find((r) => r._id === roomId);
            const updatedRooms = existingRoom
                ? state.rooms
                : [...state.rooms, content.room];

            const firstCollectionId = content.collections[0]?._id || null;

            set({
                currentRoom: content.room,
                collections: content.collections,
                unviewedCounts: content.unviewedCounts,
                links: content.links || [],
                viewedLinkIds: new Set(content.viewedLinkIds || []),
                commentCounts: content.commentCounts || {},
                rooms: updatedRooms,
                currentCollectionId: firstCollectionId,
                hasMoreLinks: (content.links?.length || 0) === 30, // Assume more if first page is full
                linksCache: {}, // Clear cache on room switch to avoid stale data
            });

            // Join socket room
            socketService.joinRoom(roomId);
            get().setupSocketListeners();

            // Auto-load first collection links if NOT already provided in content
            // (In the optimized version, content.links should already have the first page)
            if (firstCollectionId && (!content.links || content.links.length === 0)) {
                await get().fetchCollectionLinks(firstCollectionId, false);
            }

            set({ isLoadingContent: false });
        } catch (error: any) {
            console.error('Failed to select room:', error);
            const message = error.response?.data?.message || error.message || 'Failed to access room';
            setCryptoStatus('idle');
            set({ isLoadingContent: false, error: message });
        }
    },

    refreshCurrentRoom: async () => {
        const state = get();
        if (!state.currentRoom) return;
        const { setCryptoStatus } = useSessionStore.getState();

        try {
            const content: RoomContent = await socialService.getRoomContent(state.currentRoom._id);
            const sessionUser = useSessionStore.getState().user;

            // Note: We don't re-decrypt the room key here as we preserve existing keys
            // But we can decrypt any new room keys if somehow missing
            if (content.room.encryptedRoomKey && sessionUser?.privateKey && !state.roomKeys.has(state.currentRoom._id)) {
                try {
                    setCryptoStatus('decrypting');
                    const roomKey = await decryptRoomKeyWithPQC(
                        content.room.encryptedRoomKey,
                        sessionUser.privateKey
                    );
                    state.roomKeys.set(state.currentRoom._id, roomKey);
                    setCryptoStatus('idle');
                } catch (err) {
                    console.error('Failed to decrypt room key during refresh:', err);
                    setCryptoStatus('idle');
                }
            }

            // Silent update of content
            set({
                // currentRoom: content.room, // Keep existing room obj to prevent full re-render flickering
                collections: content.collections,
                unviewedCounts: content.unviewedCounts,
                // Do NOT overwrite links, viewedLinkIds or commentCounts here 
                // as they are handled by fetchCollectionLinks now
                // Do NOT reset currentCollectionId or loading state
            });
        } catch (error) {
            console.error('Failed to refresh room:', error);
        }
    },

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
                // We trust the socket to have kept the cache updated.
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

    fetchCollectionLinks: async (collectionId: string, isLoadMore: boolean = false, silent: boolean = false) => {
        const state = get();
        if (!state.currentRoom) return;

        if (!silent && !isLoadMore) {
            set({ isLoadingLinks: true });
        }

        // Calculate cursor: undefined for first load/refresh, derived from last link for loadMore
        let beforeCursor: { createdAt: string; id: string } | undefined;
        if (isLoadMore && state.links.length > 0) {
            const lastLink = state.links[state.links.length - 1];
            beforeCursor = {
                createdAt: lastLink.createdAt,
                id: lastLink._id
            };
        }

        try {
            const result = await socialService.getCollectionLinks(
                state.currentRoom._id,
                collectionId,
                30,
                beforeCursor
            );

            // Guard: Check if user has switched to a different collection while we were fetching
            // If so, discard this result to prevent overwriting the new collection's data
            const currentState = get();
            if (currentState.currentCollectionId !== collectionId) {
                console.log(`[Store] Discarding stale fetch result for collection ${collectionId}, current is ${currentState.currentCollectionId}`);
                return;
            }

            set((prev) => {
                // Double-check inside set() callback as well for extra safety
                if (prev.currentCollectionId !== collectionId) {
                    return prev;
                }

                let newLinks = prev.links;

                if (!isLoadMore) {
                    // Initial Load / Refresh
                    if (silent) {
                        // Silent update: Merge/Prepend
                        const existingLinkIds = new Set(prev.links.map(l => l._id));
                        const refreshedLinks = result.links;

                        const newItems = refreshedLinks.filter(l => !existingLinkIds.has(l._id));
                        const refreshedMap = new Map(refreshedLinks.map(l => [l._id, l]));

                        // Update existing items in place
                        newLinks = prev.links.map(l => refreshedMap.get(l._id) || l);
                        // Add new items at top
                        newLinks = [...newItems, ...newLinks];
                    } else {
                        // Hard replace
                        newLinks = result.links;
                    }
                } else {
                    // Load More: Append
                    const existingIds = new Set(prev.links.map(l => l._id));
                    // Filter duplicates just in case
                    const uniqueNewLinks = result.links.filter(l => !existingIds.has(l._id));
                    newLinks = [...prev.links, ...uniqueNewLinks];
                }

                return {
                    links: newLinks,
                    viewedLinkIds: (!isLoadMore && !silent)
                        ? new Set(result.viewedLinkIds)
                        : new Set([...prev.viewedLinkIds, ...result.viewedLinkIds]),
                    // Always merge commentCounts to preserve counts for links beyond current page
                    commentCounts: { ...prev.commentCounts, ...result.commentCounts },
                    hasMoreLinks: result.hasMore,
                    isLoadingLinks: false,
                    linksCache: {
                        ...prev.linksCache,
                        [collectionId]: {
                            links: newLinks,
                            hasMore: result.hasMore
                        }
                    }
                };
            });
        } catch (error) {
            console.error('Failed to fetch collection links:', error);
            // Only clear loading state if this collection is still current
            const currentState = get();
            if (currentState.currentCollectionId === collectionId) {
                set({ isLoadingLinks: false });
            }
        }
    },

    loadMoreLinks: async () => {
        const state = get();
        if (!state.currentCollectionId || !state.hasMoreLinks || state.isLoadingLinks) return;

        await get().fetchCollectionLinks(state.currentCollectionId, true);
    },

    createRoom: async (name: string, description: string, icon?: string) => {
        const { setCryptoStatus } = useSessionStore.getState();
        const sessionUser = useSessionStore.getState().user;
        if (!sessionUser?.publicKey) {
            throw new Error('PQC keys not initialized');
        }

        setCryptoStatus('encrypting');

        // Generate room key
        const roomKey = await generateRoomKey();

        // Encrypt room metadata
        const encryptedName = await encryptWithAES(roomKey, name);
        const encryptedDescription = await encryptWithAES(roomKey, description);
        const encryptedIcon = icon ? await encryptWithAES(roomKey, icon) : '';

        // Encrypt room key with user's PQC public key
        const encryptedRoomKey = await encryptRoomKeyWithPQC(roomKey, sessionUser.publicKey);

        setCryptoStatus('idle');

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
        const { setCryptoStatus } = useSessionStore.getState();
        const sessionUser = useSessionStore.getState().user;
        if (!sessionUser?.publicKey) {
            throw new Error('PQC keys not initialized');
        }

        setCryptoStatus('encrypting');

        // Encrypt room key with user's PQC public key
        const encryptedRoomKey = await encryptRoomKeyWithPQC(roomKey, sessionUser.publicKey);

        setCryptoStatus('idle');

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

        // Check if the link was already added by socket (LINK_UPDATED race condition)
        // In that case, the socket version may have fully-scraped metadata we don't want to overwrite
        set((prev) => {
            const existingLink = prev.links.find(l => l._id === linkPost._id);
            if (existingLink) {
                // Link already exists (added by socket), don't overwrite with stale 'scraping' version
                return prev;
            }
            return { links: [linkPost, ...prev.links] };
        });

        return linkPost;
    },

    deleteLink: async (linkId: string) => {
        await socialService.deleteLink(linkId);
        const state = get();
        set({ links: state.links.filter(l => l._id !== linkId) });
    },

    createCollection: async (name: string) => {
        const state = get();
        const { setCryptoStatus } = useSessionStore.getState();
        if (!state.currentRoom) throw new Error('No room selected');

        const roomKey = state.roomKeys.get(state.currentRoom._id);
        if (!roomKey) throw new Error('Room key not available');

        setCryptoStatus('encrypting');

        // Encrypt collection name
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
        if (state.viewedLinkIds.has(linkId)) return;

        // Optimistically update the UI
        const newViewedIds = new Set(state.viewedLinkIds);
        newViewedIds.add(linkId);

        // Find the link to get its collectionId
        const link = state.links.find(l => l._id === linkId);
        const newUnviewedCounts = { ...state.unviewedCounts };
        if (link && newUnviewedCounts[link.collectionId]) {
            newUnviewedCounts[link.collectionId] = Math.max(0, newUnviewedCounts[link.collectionId] - 1);
        }

        set({
            viewedLinkIds: newViewedIds,
            unviewedCounts: newUnviewedCounts
        });

        try {
            await socialService.markLinkViewed(linkId);
        } catch (error) {
            // Revert on error
            console.error('Failed to mark link as viewed:', error);
            const revertedViewed = new Set(state.viewedLinkIds);
            set({
                viewedLinkIds: revertedViewed,
                unviewedCounts: state.unviewedCounts
            });
        }
    },

    unmarkLinkViewed: async (linkId: string) => {
        const state = get();
        if (!state.viewedLinkIds.has(linkId)) return;

        // Optimistically update the UI
        const newViewedIds = new Set(state.viewedLinkIds);
        newViewedIds.delete(linkId);

        // Find the link to get its collectionId
        const link = state.links.find(l => l._id === linkId);
        const newUnviewedCounts = { ...state.unviewedCounts };
        if (link) {
            newUnviewedCounts[link.collectionId] = (newUnviewedCounts[link.collectionId] || 0) + 1;
        }

        set({
            viewedLinkIds: newViewedIds,
            unviewedCounts: newUnviewedCounts
        });

        try {
            await socialService.unmarkLinkViewed(linkId);
        } catch (error) {
            // Revert on error
            console.error('Failed to unmark link as viewed:', error);
            const revertedViewed = new Set(state.viewedLinkIds);
            revertedViewed.add(linkId);
            set({
                viewedLinkIds: revertedViewed,
                unviewedCounts: state.unviewedCounts
            });
        }
    },

    getUnviewedCountByCollection: (collectionId: string) => {
        const state = get();
        return state.unviewedCounts[collectionId] || 0;
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

    clearError: () => {
        set({ error: null });
    },

    clearSocial: () => {
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
        });
    },

    setupSocketListeners: () => {
        // Remove existing listeners to avoid duplicates
        // Use removeAllListeners instead of off() since we don't have references to the callbacks
        socketService.removeAllListeners('NEW_LINK');
        socketService.removeAllListeners('NEW_COMMENT');
        socketService.removeAllListeners('LINK_UPDATED');
        socketService.removeAllListeners('LINK_DELETED');
        socketService.removeAllListeners('LINK_MOVED');
        socketService.removeAllListeners('connect');
        socketService.removeAllListeners('disconnect');
        socketService.removeAllListeners('reconnect_attempt');

        socketService.on('NEW_LINK', (data: { link: LinkPost, collectionId: string }) => {
            console.log('[Socket] NEW_LINK received:', data.link._id, 'scrapeStatus:', data.link.previewData?.scrapeStatus);
            const currentState = get();

            if (currentState.currentCollectionId === data.collectionId) {
                // If we are looking at this collection, prepend the new link
                const exists = currentState.links.some(l => l._id === data.link._id);
                console.log('[Socket] NEW_LINK - checking current view, exists:', exists);
                if (!exists) {
                    set((prev) => ({
                        links: [data.link, ...prev.links]
                    }));
                }
            }

            // Update cache regardless of current view
            const cache = currentState.linksCache[data.collectionId];
            if (cache) {
                const exists = cache.links.some(l => l._id === data.link._id);
                if (!exists) {
                    set((prev) => ({
                        linksCache: {
                            ...prev.linksCache,
                            [data.collectionId]: {
                                ...cache,
                                links: [data.link, ...cache.links]
                            }
                        }
                    }));
                }
            }
        });

        socketService.on('NEW_COMMENT', (data: { linkId: string, commentCount: number }) => {
            set((prev) => ({
                commentCounts: {
                    ...prev.commentCounts,
                    [data.linkId]: data.commentCount
                }
            }));
        });

        socketService.on('LINK_UPDATED', (data: { link: LinkPost }) => {
            console.log('[Socket] LINK_UPDATED received:', data.link._id, 'scrapeStatus:', data.link.previewData?.scrapeStatus);

            set((prev) => {
                const collectionId = data.link.collectionId;
                const linkExistsInState = prev.links.some(l => l._id === data.link._id);
                const currentCollectionId = get().currentCollectionId;

                console.log('[Socket] LINK_UPDATED - link exists in state:', linkExistsInState, 'total links:', prev.links.length);

                let updatedLinks;
                if (linkExistsInState) {
                    // Normal update path: link exists, just update it
                    updatedLinks = prev.links.map(l => l._id === data.link._id ? data.link : l);
                } else if (currentCollectionId === collectionId) {
                    // Race condition: LINK_UPDATED arrived before postLink() added the link to state
                    // Prepend the fully-scraped link to avoid being stuck on "scraping"
                    console.log('[Socket] LINK_UPDATED - race condition detected, adding link to state');
                    updatedLinks = [data.link, ...prev.links];
                } else {
                    // Link is for a different collection we're not viewing, skip updating main links array
                    updatedLinks = prev.links;
                }

                // Always update cache if it exists for that collection
                const cache = prev.linksCache[collectionId];
                let newCache = prev.linksCache;
                if (cache) {
                    const cacheExists = cache.links.some(l => l._id === data.link._id);
                    newCache = {
                        ...prev.linksCache,
                        [collectionId]: {
                            ...cache,
                            links: cacheExists
                                ? cache.links.map(l => l._id === data.link._id ? data.link : l)
                                : [data.link, ...cache.links]
                        }
                    };
                }

                return {
                    links: updatedLinks,
                    linksCache: newCache
                };
            });
        });

        socketService.on('LINK_DELETED', (data: { linkId: string, collectionId: string }) => {
            set((prev) => {
                const updatedLinks = prev.links.filter(l => l._id !== data.linkId);

                const cache = prev.linksCache[data.collectionId];
                let newCache = prev.linksCache;

                if (cache) {
                    newCache = {
                        ...prev.linksCache,
                        [data.collectionId]: {
                            ...cache,
                            links: cache.links.filter(l => l._id !== data.linkId)
                        }
                    };
                }

                return {
                    links: updatedLinks,
                    linksCache: newCache
                };
            });
        });

        socketService.on('LINK_MOVED', (data: { linkId: string, newCollectionId: string, link: LinkPost }) => {
            const currentState = get();

            if (currentState.currentCollectionId === data.newCollectionId) {
                // If moved TO the current collection, add it (or update if exists)
                const exists = currentState.links.some(l => l._id === data.linkId);
                if (!exists) {
                    set((prev) => ({
                        links: [data.link, ...prev.links]
                    }));
                } else {
                    set((prev) => ({
                        links: prev.links.map(l => l._id === data.linkId ? data.link : l)
                    }));
                }
            } else {
                // Should we remove it from current view if it was there?
                set((prev) => ({
                    links: prev.links.filter(l => l._id !== data.linkId)
                }));
            }

            // Update Cache
            set((prev) => {
                let newCache = { ...prev.linksCache };

                // Remove from all potential old locations in cache
                Object.keys(newCache).forEach(cId => {
                    const cache = newCache[cId];

                    if (cId === data.newCollectionId) {
                        // Add to new
                        const exists = cache.links.some(l => l._id === data.linkId);
                        if (!exists) {
                            newCache[cId] = {
                                ...cache,
                                links: [data.link, ...cache.links]
                            };
                        }
                    } else {
                        // Remove from others
                        if (cache.links.some(l => l._id === data.linkId)) {
                            newCache[cId] = {
                                ...cache,
                                links: cache.links.filter(l => l._id !== data.linkId)
                            };
                        }
                    }
                });

                return { linksCache: newCache };
            });
        });

        // Graceful Disconnection Handling
        socketService.on('disconnect', () => {
            console.log('[Store] Socket disconnected - data may become stale');
            // We could set a flag here to show a connection warning in the UI
            // For now, just log. On reconnect, we'll refresh.
        });

        // Data Refresh on Reconnection
        socketService.on('connect', () => {
            const state = get();
            console.log('[Store] Socket Reconnected - refreshing data');

            if (state.currentRoom) {
                // Invalidate cache to ensure we fetch fresh data, as we might have missed events while disconnected.
                set({ linksCache: {} });

                // Refresh the current view immediately so the user sees correct data
                const collectionId = state.currentCollectionId;
                if (collectionId) {
                    // Use a small delay to ensure the re-join (managed by SocketService) propagates first
                    setTimeout(() => {
                        const currentState = get();
                        if (currentState.currentCollectionId === collectionId) {
                            get().fetchCollectionLinks(collectionId, false, true); // silent refresh
                        }
                    }, 150);
                }
            }
        });

    }
}));

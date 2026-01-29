import type { StateCreator } from 'zustand';
import type { SocialState } from './types';
import socialService, { type RoomContent } from '@/services/socialService';
import socketService from '@/services/socketService';
import { useSessionStore } from '../sessionStore';
import {
    decryptRoomKeyWithPQC,
    generateRoomKey,
    encryptWithAES,
    encryptRoomKeyWithPQC,
    exportRoomKeyToBase64
} from '@/utils/socialCrypto';

export const createRoomSlice: StateCreator<SocialState, [], [], Pick<SocialState, keyof import('./types').RoomSlice>> = (set, get) => ({
    rooms: [],
    currentRoom: null,
    isLoadingRooms: false,
    isLoadingContent: false,
    pendingInvite: null,
    error: null,

    fetchRooms: async () => {
        const { setCryptoStatus } = useSessionStore.getState();
        set({ isLoadingRooms: true });
        try {
            const sessionUser = useSessionStore.getState().user;
            if (!sessionUser?.privateKey) return;

            const rooms = await socialService.getUserRooms();
            set({ rooms });

            // Proactive Background Decryption for room names/descriptions
            const state = get();
            const roomsToDecrypt = rooms.filter(r => r.encryptedRoomKey && !state.roomKeys.has(r._id));

            if (roomsToDecrypt.length > 0) {
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

                            set((prev) => {
                                const updatedKeys = new Map(prev.roomKeys);
                                updatedKeys.set(room._id, roomKey);
                                return { roomKeys: updatedKeys };
                            });
                        } catch (err) {
                            console.error(`Failed to background decrypt room ${room._id}:`, err);
                        }
                    }
                    setCryptoStatus('idle');
                }, 100);
            }
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
            set({ error: 'Failed to load rooms. Please refresh.' });
        } finally {
            set({ isLoadingRooms: false });
            setCryptoStatus('idle');
        }
    },

    selectRoom: async (roomId: string, initialCollectionId?: string) => {
        const state = get();
        // Avoid parallel requests to the same room or if already loading
        if (state.isLoadingContent && state.currentRoom?._id === roomId) return null;

        set({
            isLoadingContent: true,
            isLoadingLinks: true,
            error: null,
            collections: [],
            links: [],
            currentCollectionId: null,
        });

        socketService.joinRoom(roomId);
        get().setupSocketListeners();

        const { setCryptoStatus } = useSessionStore.getState();
        try {
            // Pass initialCollectionId to avoid waterfall requests
            const content: RoomContent = await socialService.getRoomContent(roomId, initialCollectionId);
            const sessionUser = useSessionStore.getState().user;

            if (content.room.encryptedRoomKey && sessionUser?.privateKey) {
                try {
                    setCryptoStatus('decrypting');
                    const roomKey = await decryptRoomKeyWithPQC(
                        content.room.encryptedRoomKey,
                        sessionUser.privateKey
                    );
                    set((prev) => {
                        const updatedKeys = new Map(prev.roomKeys);
                        updatedKeys.set(roomId, roomKey);
                        return { roomKeys: updatedKeys };
                    });
                } catch (err) {
                    console.error('Failed to decrypt room key:', err);
                } finally {
                    setCryptoStatus('idle');
                }
            }

            const currentState = get();
            const updatedRooms = currentState.rooms.some(r => r._id === roomId)
                ? currentState.rooms.map(r => r._id === roomId ? content.room : r)
                : [...currentState.rooms, content.room];

            // Use initialCollectionId if provided and exists in the fetched collections
            // Otherwise fall back to the first collection
            const targetCollectionId = initialCollectionId && content.collections.some(c => c._id === initialCollectionId)
                ? initialCollectionId
                : (content.collections[0]?._id || null);

            const linksCache = { ...currentState.linksCache };
            if (targetCollectionId && content.links) {
                linksCache[targetCollectionId] = {
                    links: content.links,
                    hasMore: (content.links?.length || 0) >= 12
                };
            }

            set({
                currentRoom: content.room,
                collections: content.collections,
                unviewedCounts: content.unviewedCounts,
                links: content.links || [],
                viewedLinkIds: new Set(content.viewedLinkIds || []),
                commentCounts: content.commentCounts || {},
                rooms: updatedRooms,
                currentCollectionId: targetCollectionId,
                hasMoreLinks: (content.links?.length || 0) >= 12,
                linksCache
            });
            // Waterfall fetch removed since getRoomContent now handles it

            return targetCollectionId;
        } catch (error: unknown) {
            console.error('Failed to select room:', error);
            let message = 'Failed to access room';
            
            if (error instanceof Error) {
                message = error.message;
            } else if (typeof error === 'object' && error !== null && 'response' in error) {
                const apiError = error as { response?: { data?: { message?: string } } };
                message = apiError.response?.data?.message || 'Failed to access room';
            }
            
            set({ error: message });
            return null;
        } finally {
            set({ isLoadingContent: false, isLoadingLinks: false });
            setCryptoStatus('idle');
        }
    },

    refreshCurrentRoom: async () => {
        const state = get();
        if (!state.currentRoom) return;
        const { setCryptoStatus } = useSessionStore.getState();

        try {
            // Don't pass collectionId - this is just for refreshing collections metadata
            // Links are managed separately through selectCollection
            const content: RoomContent = await socialService.getRoomContent(state.currentRoom._id);
            const sessionUser = useSessionStore.getState().user;

            if (content.room.encryptedRoomKey && sessionUser?.privateKey && !state.roomKeys.has(state.currentRoom._id)) {
                try {
                    setCryptoStatus('decrypting');
                    const roomKey = await decryptRoomKeyWithPQC(
                        content.room.encryptedRoomKey,
                        sessionUser.privateKey
                    );
                    set((prev) => {
                        const updatedKeys = new Map(prev.roomKeys);
                        updatedKeys.set(state.currentRoom!._id, roomKey);
                        return { roomKeys: updatedKeys };
                    });
                    setCryptoStatus('idle');
                } catch (err) {
                    console.error('Failed to decrypt room key during refresh:', err);
                    setCryptoStatus('idle');
                }
            }

            set({
                collections: content.collections,
                unviewedCounts: content.unviewedCounts,
            });
        } catch (error) {
            console.error('Failed to refresh room:', error);
        }
    },

    createRoom: async (name: string, description: string, icon?: string) => {
        const { setCryptoStatus } = useSessionStore.getState();
        const sessionUser = useSessionStore.getState().user;
        if (!sessionUser?.publicKey) throw new Error('PQC keys not initialized');

        setCryptoStatus('encrypting');
        try {
            const roomKey = await generateRoomKey();
            const encryptedName = await encryptWithAES(roomKey, name);
            const encryptedDescription = await encryptWithAES(roomKey, description);
            const encryptedIcon = icon ? await encryptWithAES(roomKey, icon) : '';
            const encryptedRoomKey = await encryptRoomKeyWithPQC(roomKey, sessionUser.publicKey);

            setCryptoStatus('idle');

            const room = await socialService.createRoom({
                name: encryptedName,
                description: encryptedDescription,
                icon: encryptedIcon,
                encryptedRoomKey,
            });

            set((prev) => {
                const updatedKeys = new Map(prev.roomKeys);
                updatedKeys.set(room._id, roomKey);
                return {
                    roomKeys: updatedKeys,
                    rooms: [...prev.rooms, room],
                    currentRoom: room,
                };
            });

            return room;
        } catch (error) {
            console.error('Failed to create room:', error);
            throw error;
        } finally {
            setCryptoStatus('idle');
        }
    },

    joinRoom: async (inviteCode: string, roomKey: CryptoKey) => {
        const { setCryptoStatus } = useSessionStore.getState();
        const sessionUser = useSessionStore.getState().user;
        if (!sessionUser?.publicKey) {
            throw new Error('PQC keys not initialized');
        }

        setCryptoStatus('encrypting');

        try {
            const encryptedRoomKey = await encryptRoomKeyWithPQC(roomKey, sessionUser.publicKey);
            setCryptoStatus('idle');

            const result = await socialService.joinRoom(inviteCode, encryptedRoomKey);
            await get().selectRoom(result.roomId);
            set({ pendingInvite: null });
        } catch (error) {
            console.error('Failed to join room:', error);
            throw error;
        } finally {
            setCryptoStatus('idle');
        }
    },

    createInvite: async (roomId: string) => {
        const state = get();
        const roomKey = state.roomKeys.get(roomId);

        if (!roomKey) {
            throw new Error('Room key not available');
        }

        const { inviteCode } = await socialService.createInvite(roomId);
        const keyBase64 = await exportRoomKeyToBase64(roomKey);
        const baseUrl = window.location.origin;
        return `${baseUrl}/invite/${inviteCode}#${keyBase64}`;
    },

    setPendingInvite: (invite) => {
        set({ pendingInvite: invite });
    },

    clearError: () => {
        set({ error: null });
    },

    clearRoomContent: () => {
        set({
            currentRoom: null,
            collections: [],
            links: [],
            currentCollectionId: null,
            isLoadingContent: false,
            isLoadingLinks: false,
            hasMoreLinks: false,
            error: null,
            linksCache: {},
        });
    },
});

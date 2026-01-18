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

                            // We use a new Map to ensure reactiveness
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
                }, 100);
            }
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
            setCryptoStatus('idle');
            set({ isLoadingRooms: false, error: 'Failed to load rooms. Please refresh.' });
        }
    },

    selectRoom: async (roomId: string) => {
        const state = get();
        if (state.isLoadingContent && state.currentRoom?._id === roomId) return;

        set({
            isLoadingContent: true,
            error: null
        });

        const { setCryptoStatus } = useSessionStore.getState();
        try {
            const content: RoomContent = await socialService.getRoomContent(roomId);
            const state = get();
            const sessionUser = useSessionStore.getState().user;

            // Decrypt room key if we have one
            if (content.room.encryptedRoomKey && sessionUser?.privateKey) {
                try {
                    setCryptoStatus('decrypting');
                    const roomKey = await decryptRoomKeyWithPQC(
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
                hasMoreLinks: (content.links?.length || 0) >= 12, // Match backend limit
                linksCache: {}, // Clear cache on room switch
            });

            // Join socket room
            socketService.joinRoom(roomId);
            get().setupSocketListeners();

            // Auto-load first collection links if needed
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
        if (!sessionUser?.publicKey) {
            throw new Error('PQC keys not initialized');
        }

        setCryptoStatus('encrypting');

        try {
            const roomKey = await generateRoomKey();
            const encryptedName = await encryptWithAES(roomKey, name);
            const encryptedDescription = await encryptWithAES(roomKey, description);
            const encryptedIcon = icon ? await encryptWithAES(roomKey, icon) : '';

            const encryptedRoomKey = await encryptRoomKeyWithPQC(roomKey, sessionUser.publicKey);

            // Allow checking status before network call
            setCryptoStatus('idle');

            const room = await socialService.createRoom({
                name: encryptedName,
                description: encryptedDescription,
                icon: encryptedIcon,
                encryptedRoomKey,
            });

            const state = get();
            state.roomKeys.set(room._id, roomKey);

            set({
                rooms: [...state.rooms, room],
                currentRoom: room,
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
});

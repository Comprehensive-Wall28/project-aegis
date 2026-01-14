import apiClient from './api';

// Types
export interface RoomMember {
    userId: string;
    role: 'owner' | 'admin' | 'member';
    encryptedRoomKey: string;
}

export interface Room {
    _id: string;
    name: string; // Encrypted
    description: string; // Encrypted
    icon: string; // Encrypted
    members: RoomMember[];
    inviteCode?: string;
    encryptedRoomKey?: string; // User's encrypted copy of room key
    memberCount?: number; // Number of members (from API)
}

export interface Collection {
    _id: string;
    roomId: string;
    name: string; // Encrypted
    type: 'links' | 'discussion';
}

export interface PreviewData {
    title?: string;
    description?: string;
    image?: string;
}

export interface LinkPost {
    _id: string;
    collectionId: string;
    userId: { _id: string; username: string } | string;
    url: string;
    previewData: PreviewData;
    createdAt: string;
}

export interface RoomContent {
    room: Room;
    collections: Collection[];
    links: LinkPost[];
}

export interface CreateRoomData {
    name: string; // Encrypted
    description?: string; // Encrypted
    icon?: string;
    encryptedRoomKey: string;
}

export interface InviteInfo {
    name: string; // Encrypted
    description: string; // Encrypted
    icon: string;
}

const socialService = {
    /**
     * Get all rooms the user is a member of
     */
    getUserRooms: async (): Promise<Room[]> => {
        const response = await apiClient.get<Room[]>('/social/rooms');
        return response.data;
    },

    /**
     * Create a new room with encrypted metadata
     */
    createRoom: async (data: CreateRoomData): Promise<Room> => {
        const response = await apiClient.post<Room>('/social/rooms', data);
        return response.data;
    },

    /**
     * Get room content including collections and links
     */
    getRoomContent: async (roomId: string): Promise<RoomContent> => {
        const response = await apiClient.get<RoomContent>(`/social/rooms/${roomId}`);
        return response.data;
    },

    /**
     * Create an invite code for a room
     */
    createInvite: async (roomId: string): Promise<{ inviteCode: string }> => {
        const response = await apiClient.post<{ inviteCode: string }>(
            `/social/rooms/${roomId}/invite`
        );
        return response.data;
    },

    /**
     * Get invite information (public endpoint)
     */
    getInviteInfo: async (inviteCode: string): Promise<InviteInfo> => {
        const response = await apiClient.get<InviteInfo>(`/social/invite/${inviteCode}`);
        return response.data;
    },

    /**
     * Join a room using invite code and encrypted room key
     */
    joinRoom: async (
        inviteCode: string,
        encryptedRoomKey: string
    ): Promise<{ message: string; roomId: string }> => {
        const response = await apiClient.post<{ message: string; roomId: string }>(
            '/social/rooms/join',
            { inviteCode, encryptedRoomKey }
        );
        return response.data;
    },

    /**
     * Post a link to a room collection
     */
    postLink: async (
        roomId: string,
        url: string,
        collectionId?: string
    ): Promise<LinkPost> => {
        const response = await apiClient.post<LinkPost>(
            `/social/rooms/${roomId}/links`,
            { url, collectionId }
        );
        return response.data;
    },
};

export default socialService;

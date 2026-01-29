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
    favicon?: string;
    scrapeStatus?: 'success' | 'blocked' | 'failed' | 'scraping';
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
    viewedLinkIds: string[];
    commentCounts: Record<string, number>;
    unviewedCounts: Record<string, number>;
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

export interface LinkComment {
    _id: string;
    linkId: string;
    userId: { _id: string; username: string } | string;
    encryptedContent: string;
    createdAt: string;
}

export interface ReaderContent {
    title: string;
    byline: string | null;
    content: string;
    textContent: string;
    siteName: string | null;
    status: 'success' | 'blocked' | 'failed';
    error?: string;
    annotationCounts: Record<string, number>;
}

export interface ReaderAnnotation {
    _id: string;
    linkId: string;
    roomId: string;
    userId: { _id: string; username: string } | string;
    paragraphId: string;
    highlightText: string;
    encryptedContent: string;
    createdAt: string;
}

export const retryOperation = async <T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 1000
): Promise<T> => {
    try {
        return await operation();
    } catch (error) {
        if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        throw error;
    }
};

const socialService = {
    /**
     * Get all rooms the user is a member of
     */
    getUserRooms: async (): Promise<Room[]> => {
        const response = await apiClient.get<Room[]>('social/rooms');
        return response.data;
    },

    /**
     * Create a new room with encrypted metadata
     */
    createRoom: async (data: CreateRoomData): Promise<Room> => {
        const response = await apiClient.post<Room>('social/rooms', data);
        return response.data;
    },

    /**
     * Get room content including collections and links
     */
    /**
     * Get room content including collections and links
     */
    getRoomContent: async (roomId: string, collectionId?: string): Promise<RoomContent> => {
        const response = await apiClient.get<RoomContent>(`social/rooms/${roomId}`, {
            params: { collectionId }
        });
        return response.data;
    },

    /**
     * Get links for a specific collection with pagination
     */
    getCollectionLinks: async (
        roomId: string,
        collectionId: string,
        limit: number = 30,
        beforeCursor?: { createdAt: string; id: string }
    ): Promise<{
        links: LinkPost[];
        totalCount: number;
        hasMore: boolean;
        viewedLinkIds: string[];
        commentCounts: Record<string, number>;
    }> => {
        const response = await apiClient.get(
            `social/rooms/${roomId}/collections/${collectionId}/links`,
            {
                params: {
                    limit,
                    cursorCreatedAt: beforeCursor?.createdAt,
                    cursorId: beforeCursor?.id
                }
            }
        );
        return response.data;
    },

    /**
     * Create an invite code for a room
     */
    createInvite: async (roomId: string): Promise<{ inviteCode: string }> => {
        const response = await apiClient.post<{ inviteCode: string }>(
            `social/rooms/${roomId}/invite`
        );
        return response.data;
    },

    /**
     * Get invite information (public endpoint)
     */
    getInviteInfo: async (inviteCode: string): Promise<InviteInfo> => {
        const response = await apiClient.get<InviteInfo>(`social/invite/${inviteCode}`);
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
            'social/rooms/join',
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
            `social/rooms/${roomId}/links`,
            { url, collectionId }
        );
        return response.data;
    },

    /**
     * Delete a link post
     */
    deleteLink: async (linkId: string): Promise<void> => {
        await apiClient.delete(`social/links/${linkId}`);
    },

    /**
     * Create a new collection in a room
     */
    createCollection: async (
        roomId: string,
        name: string,
        type: 'links' | 'discussion' = 'links'
    ): Promise<Collection> => {
        const response = await apiClient.post<Collection>(
            `social/rooms/${roomId}/collections`,
            { name, type }
        );
        return response.data;
    },

    /**
     * Move a link to a different collection
     */
    moveLink: async (linkId: string, collectionId: string): Promise<void> => {
        await apiClient.patch(`social/links/${linkId}/move`, { collectionId });
    },

    /**
     * Mark a link as viewed by the current user
     */
    markLinkViewed: async (linkId: string): Promise<void> => {
        await apiClient.post(`social/links/${linkId}/view`);
    },

    /**
     * Unmark a link as viewed by the current user
     */
    unmarkLinkViewed: async (linkId: string): Promise<void> => {
        await apiClient.delete(`social/links/${linkId}/view`);
    },

    /**
     * Get comments for a link with pagination
     */
    getComments: async (
        linkId: string,
        limit: number = 20,
        beforeCursor?: { createdAt: string; id: string }
    ): Promise<{
        comments: LinkComment[];
        totalCount: number;
        hasMore: boolean;
    }> => {
        const response = await apiClient.get<{
            comments: LinkComment[];
            totalCount: number;
            hasMore: boolean;
        }>(`social/links/${linkId}/comments`, {
            params: {
                limit,
                cursorCreatedAt: beforeCursor?.createdAt,
                cursorId: beforeCursor?.id
            }
        });
        return response.data;
    },

    /**
     * Post a new comment on a link
     */
    postComment: async (linkId: string, encryptedContent: string): Promise<LinkComment> => {
        const response = await apiClient.post<LinkComment>(`social/links/${linkId}/comments`, { encryptedContent });
        return response.data;
    },

    /**
     * Delete a comment
     */
    deleteComment: async (commentId: string): Promise<void> => {
        await apiClient.delete(`social/comments/${commentId}`);
    },

    /**
     * Delete a collection from a room
     */
    deleteCollection: async (collectionId: string): Promise<void> => {
        await apiClient.delete(`social/collections/${collectionId}`);
    },

    /**
     * Update/Rename a collection
     */
    updateCollection: async (collectionId: string, name: string): Promise<Collection> => {
        const response = await apiClient.patch<Collection>(`social/collections/${collectionId}`, {
            name
        });
        return response.data;
    },

    /**
     * Reorder collections in a room
     */
    reorderCollections: async (roomId: string, collectionIds: string[]): Promise<void> => {
        await apiClient.patch(`social/rooms/${roomId}/collections/reorder`, {
            collectionIds,
        });
    },

    /**
     * Search links across all collections in a room
     */
    searchRoomLinks: async (
        roomId: string,
        query: string,
        limit: number = 50,
        signal?: AbortSignal
    ): Promise<{
        links: LinkPost[];
        viewedLinkIds: string[];
        commentCounts: Record<string, number>;
    }> => {
        const response = await apiClient.get(`/social/rooms/${roomId}/search`, {
            params: { q: query, limit },
            signal
        });
        return response.data;
    },

    // ============== Reader Mode Methods ==============

    /**
     * Get reader content for a link (cleaned article HTML)
     */
    getReaderContent: async (linkId: string): Promise<ReaderContent> => {
        const response = await apiClient.get<ReaderContent>(`/social/links/${linkId}/reader`);
        return response.data;
    },

    /**
     * Get all annotations for a link
     */
    getAnnotations: async (linkId: string): Promise<ReaderAnnotation[]> => {
        const response = await apiClient.get<ReaderAnnotation[]>(`/social/links/${linkId}/annotations`);
        return response.data;
    },

    /**
     * Create an annotation on a paragraph
     */
    createAnnotation: async (
        linkId: string,
        paragraphId: string,
        highlightText: string,
        encryptedContent: string
    ): Promise<ReaderAnnotation> => {
        const response = await apiClient.post<ReaderAnnotation>(
            `/social/links/${linkId}/annotations`,
            { paragraphId, highlightText, encryptedContent }
        );
        return response.data;
    },

    /**
     * Delete an annotation
     */
    deleteAnnotation: async (annotationId: string): Promise<void> => {
        await apiClient.delete(`/social/annotations/${annotationId}`);
    },
};

export default socialService;

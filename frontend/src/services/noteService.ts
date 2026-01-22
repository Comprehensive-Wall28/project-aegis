import apiClient from './api';

const PREFIX = '/notes';

// Types for note metadata (from backend)
export interface NoteMetadata {
    _id: string;
    userId: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    gridFsFileId: string;
    contentSize: number;
    tags: string[];
    linkedEntityIds: string[];
    educationalContext?: {
        subject?: string;
        semester?: string;
    };
    recordHash: string;
    createdAt: string;
    updatedAt: string;
}

// Types for note content response
export interface NoteContentResponse {
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    encryptedContent: string;  // Base64 encoded
    contentSize: number;
}

// Types for creating a note
export interface CreateNoteInput {
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    encryptedContent: string;  // Base64 encoded encrypted content
    tags?: string[];
    linkedEntityIds?: string[];
    educationalContext?: {
        subject?: string;
        semester?: string;
    };
    recordHash: string;
}

// Types for updating note metadata
export interface UpdateNoteMetadataInput {
    tags?: string[];
    linkedEntityIds?: string[];
    educationalContext?: {
        subject?: string;
        semester?: string;
    };
    recordHash?: string;
}

// Types for updating note content
export interface UpdateNoteContentInput {
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    encryptedContent: string;  // Base64 encoded
    recordHash: string;
}

// Paginated response
export interface PaginatedNotes {
    items: NoteMetadata[];
    nextCursor: string | null;
}

const noteService = {
    /**
     * Get all notes for the current user
     */
    getNotes: async (filters?: {
        tags?: string[];
        subject?: string;
        semester?: string
    }): Promise<NoteMetadata[]> => {
        const params = new URLSearchParams();
        if (filters?.tags) params.append('tags', filters.tags.join(','));
        if (filters?.subject) params.append('subject', filters.subject);
        if (filters?.semester) params.append('semester', filters.semester);

        const response = await apiClient.get<NoteMetadata[]>(`${PREFIX}`, { params });
        return response.data;
    },

    /**
     * Get paginated notes
     */
    getNotesPaginated: async (options: {
        limit: number;
        cursor?: string;
        tags?: string[];
        signal?: AbortSignal
    }): Promise<PaginatedNotes> => {
        const params = new URLSearchParams();
        params.append('limit', options.limit.toString());
        if (options.cursor) params.append('cursor', options.cursor);
        if (options.tags) params.append('tags', options.tags.join(','));

        const response = await apiClient.get<PaginatedNotes>(`${PREFIX}`, {
            params,
            signal: options.signal
        });
        return response.data;
    },

    /**
     * Get a single note by ID (metadata only)
     */
    getNote: async (id: string): Promise<NoteMetadata> => {
        const response = await apiClient.get<NoteMetadata>(`${PREFIX}/${id}`);
        return response.data;
    },

    /**
     * Get note content (encrypted, base64 encoded)
     */
    getNoteContent: async (id: string): Promise<NoteContentResponse> => {
        const response = await apiClient.get<NoteContentResponse>(`${PREFIX}/${id}/content`);
        return response.data;
    },

    /**
     * Create a new note
     */
    createNote: async (data: CreateNoteInput): Promise<NoteMetadata> => {
        const response = await apiClient.post<NoteMetadata>(`${PREFIX}`, data);
        return response.data;
    },

    /**
     * Update note metadata (tags, links, context)
     */
    updateNoteMetadata: async (id: string, data: UpdateNoteMetadataInput): Promise<NoteMetadata> => {
        const response = await apiClient.put<NoteMetadata>(`${PREFIX}/${id}/metadata`, data);
        return response.data;
    },

    /**
     * Update note content
     */
    updateNoteContent: async (id: string, data: UpdateNoteContentInput): Promise<NoteMetadata> => {
        const response = await apiClient.put<NoteMetadata>(`${PREFIX}/${id}/content`, data);
        return response.data;
    },

    /**
     * Delete a note
     */
    deleteNote: async (id: string): Promise<void> => {
        await apiClient.delete(`${PREFIX}/${id}`);
    },

    /**
     * Get all unique tags for the user
     */
    getUserTags: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>(`${PREFIX}/tags`);
        return response.data;
    },

    /**
     * Get notes that link to a specific entity (backlinks)
     */
    getBacklinks: async (entityId: string): Promise<NoteMetadata[]> => {
        const response = await apiClient.get<NoteMetadata[]>(`${PREFIX}/backlinks/${entityId}`);
        return response.data;
    },
};

export default noteService;

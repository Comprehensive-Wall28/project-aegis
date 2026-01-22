import apiClient from './api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_URL = `${BASE_URL.replace(/\/$/, '')}/api`;
const PREFIX = '/vault';



export interface FileMetadata {
    _id: string;
    fileName: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    folderId?: string | null;
    encapsulatedKey: string;

    encryptedSymmetricKey: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedFiles {
    items: FileMetadata[];
    nextCursor: string | null;
}

const vaultService = {
    getRecentFiles: async (folderId?: string | null): Promise<FileMetadata[]> => {
        const params = folderId ? { folderId } : { folderId: 'null' };
        const response = await apiClient.get<FileMetadata[]>(`${PREFIX}/files`, { params });
        return response.data;
    },

    getFilesPaginated: async (params: {
        folderId?: string | null;
        limit: number;
        cursor?: string;
        search?: string;
        signal?: AbortSignal;
    }): Promise<PaginatedFiles> => {
        const queryParams = new URLSearchParams();
        queryParams.append('limit', params.limit.toString());
        if (params.folderId) queryParams.append('folderId', params.folderId);
        if (params.cursor) queryParams.append('cursor', params.cursor);
        if (params.search) queryParams.append('search', params.search);

        const response = await apiClient.get<PaginatedFiles>(`${PREFIX}/files`, {
            params: queryParams,
            signal: params.signal
        });
        return response.data;
    },

    getFile: async (fileId: string): Promise<FileMetadata> => {
        const response = await apiClient.get<FileMetadata>(`${PREFIX}/files/${fileId}`);
        return response.data;
    },

    downloadFile: async (fileId: string): Promise<Blob> => {
        const response = await apiClient.get(`${PREFIX}/download/${fileId}`, {
            responseType: 'blob',
        });
        return response.data;
    },

    deleteFile: async (fileId: string): Promise<void> => {
        await apiClient.delete(`${PREFIX}/files/${fileId}`);
    },

    getStorageStats: async (): Promise<{ totalStorageUsed: number; maxStorage: number }> => {
        const response = await apiClient.get(`${PREFIX}/storage-stats`);
        return response.data;
    },
};

export default vaultService;


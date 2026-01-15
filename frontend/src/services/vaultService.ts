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

const vaultService = {
    getRecentFiles: async (folderId?: string | null): Promise<FileMetadata[]> => {
        const params = folderId ? { folderId } : { folderId: 'null' };
        const response = await apiClient.get<FileMetadata[]>(`${PREFIX}/files`, { params });
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
};

export default vaultService;

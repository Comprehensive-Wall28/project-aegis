import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api/vault`;

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface FileMetadata {
    _id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
}

const vaultService = {
    getRecentFiles: async (): Promise<FileMetadata[]> => {
        const response = await apiClient.get<FileMetadata[]>('/files');
        return response.data;
    },

    downloadFile: async (fileId: string): Promise<Blob> => {
        const response = await apiClient.get(`/download/${fileId}`, {
            responseType: 'blob',
        });
        return response.data;
    },
};

export default vaultService;

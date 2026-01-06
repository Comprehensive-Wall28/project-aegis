import axios from 'axios';
import tokenService from './tokenService';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api/vault`;

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add Authorization header if token exists
apiClient.interceptors.request.use((config) => {
    const token = tokenService.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Clear token on 401 responses (auto-logout)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            tokenService.removeToken();
        }
        return Promise.reject(error);
    }
);

export interface FileMetadata {
    _id: string;
    fileName: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
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

    deleteFile: async (fileId: string): Promise<void> => {
        await apiClient.delete(`/files/${fileId}`);
    },
};

export default vaultService;

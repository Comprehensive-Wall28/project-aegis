import axios from 'axios';
import tokenService from './tokenService';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api/folders`;

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

// Clear token on 401 responses
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            tokenService.removeToken();
        }
        return Promise.reject(error);
    }
);

export interface Folder {
    _id: string;
    name: string;
    parentId?: string | null;
    createdAt: string;
    updatedAt: string;
}

const folderService = {
    getFolders: async (parentId?: string | null): Promise<Folder[]> => {
        const params = parentId ? { parentId } : { parentId: 'null' };
        const response = await apiClient.get<Folder[]>('/', { params });
        return response.data;
    },

    createFolder: async (name: string, parentId?: string | null): Promise<Folder> => {
        const response = await apiClient.post<Folder>('/', { name, parentId });
        return response.data;
    },

    renameFolder: async (id: string, name: string): Promise<Folder> => {
        const response = await apiClient.put<Folder>(`/${id}`, { name });
        return response.data;
    },

    deleteFolder: async (id: string): Promise<void> => {
        await apiClient.delete(`/${id}`);
    },

    moveFiles: async (fileIds: string[], folderId?: string | null): Promise<{ modifiedCount: number }> => {
        const response = await apiClient.put<{ modifiedCount: number }>('/move-files', { fileIds, folderId });
        return response.data;
    },
};

export default folderService;

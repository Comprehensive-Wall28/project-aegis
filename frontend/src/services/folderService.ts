import apiClient from './api';

const PREFIX = '/folders';



export interface Folder {
    _id: string;
    name: string;
    parentId?: string | null;
    createdAt: string;
    updatedAt: string;
    isShared?: boolean; // Owned by us and shared with others
    isSharedWithMe?: boolean; // Shared with us by others
    encryptedSharedKey?: string;
    permissions?: string[];
    ownerId?: string;
    encryptedSessionKey?: string;
}


const folderService = {
    getFolders: async (parentId?: string | null): Promise<Folder[]> => {
        const params = parentId ? { parentId } : { parentId: 'null' };
        const response = await apiClient.get<Folder[]>(`${PREFIX}`, { params });
        return response.data;
    },

    getFolder: async (id: string): Promise<Folder & { encryptedSessionKey?: string }> => {
        const response = await apiClient.get<Folder & { encryptedSessionKey?: string }>(`${PREFIX}/${id}`);
        return response.data;
    },

    createFolder: async (name: string, parentId?: string | null, encryptedSessionKey?: string): Promise<Folder> => {
        const response = await apiClient.post<Folder>(`${PREFIX}`, { name, parentId, encryptedSessionKey });
        return response.data;
    },

    renameFolder: async (id: string, name: string): Promise<Folder> => {
        const response = await apiClient.put<Folder>(`${PREFIX}/${id}`, { name });
        return response.data;
    },

    deleteFolder: async (id: string): Promise<void> => {
        await apiClient.delete(`${PREFIX}/${id}`);
    },

    moveFiles: async (fileIds: string[], folderId?: string | null): Promise<{ modifiedCount: number }> => {
        const response = await apiClient.put<{ modifiedCount: number }>(`${PREFIX}/move-files`, { fileIds, folderId });
        return response.data;
    },
};

export default folderService;

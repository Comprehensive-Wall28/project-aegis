import apiClient from './api';

const PREFIX = '/vault';



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
        const response = await apiClient.get<FileMetadata[]>(`${PREFIX}/files`);
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

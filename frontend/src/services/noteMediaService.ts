import apiClient from './api';
import { type FileMetadata } from './vaultService';

const PREFIX = '/notes/media';

/**
 * Note Media refers to images and other assets embedded in notes, 
 * stored in GridFS for low-latency access compared to Google Drive.
 */
const noteMediaService = {
    /**
     * Get media metadata
     */
    getMedia: async (mediaId: string): Promise<FileMetadata> => {
        const response = await apiClient.get<FileMetadata>(`${PREFIX}/metadata/${mediaId}`);
        return response.data;
    },

    /**
     * Initiate a media upload
     */
    initUpload: async (data: {
        fileName: string;
        originalFileName: string;
        fileSize: number;
        encryptedSymmetricKey: string;
        encapsulatedKey: string;
        mimeType: string;
    }): Promise<{ mediaId: string }> => {
        const response = await apiClient.post<{ mediaId: string }>(`${PREFIX}/upload-init`, data);
        return response.data;
    },

    /**
     * Upload a media chunk
     */
    uploadChunk: async (mediaId: string, chunk: Uint8Array, startByte: number, totalSize: number): Promise<void> => {
        await apiClient.put(`${PREFIX}/upload-chunk?mediaId=${mediaId}`, chunk, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Range': `bytes ${startByte}-${startByte + chunk.length - 1}/${totalSize}`
            }
        });
    },

    /**
     * Download media stream (handled by browser or manual fetch)
     */
    getDownloadUrl: (mediaId: string) => {
        return `${apiClient.defaults.baseURL}${PREFIX}/download/${mediaId}`;
    }
};

export default noteMediaService;

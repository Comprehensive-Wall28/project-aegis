import { useState, useCallback } from 'react';
import apiClient from '@/services/api';
import { useSessionStore } from '@/stores/sessionStore';
import { useFolderKeyStore } from '@/stores/useFolderKeyStore';
import { decapsulateFolderKey } from '@/lib/cryptoUtils';

export interface SharedFolder {
    _id: string;
    folderId: {
        _id: string;
        name: string;
    };
    sharedBy: {
        _id: string;
        username: string;
        email: string;
    };
    encryptedSharedKey: string;
    permissions: string[];
    createdAt: string;
}

export const useSharedFolders = () => {
    const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSharedFolders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<SharedFolder[]>('/share/shared-with-me');
            setSharedFolders(response.data);

            // Proactively decapsulate keys for folders we just fetched
            const { user } = useSessionStore.getState();
            const folderKeyStore = useFolderKeyStore.getState();

            if (user?.privateKey) {
                for (const sf of response.data) {
                    if (!folderKeyStore.getKey(sf.folderId._id)) {
                        try {
                            const key = await decapsulateFolderKey(sf.encryptedSharedKey, user.privateKey);
                            folderKeyStore.setKey(sf.folderId._id, key);
                        } catch (decapErr) {
                            console.error(`Failed to decapsulate key for folder ${sf.folderId._id}:`, decapErr);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch shared folders:', err);
            setError(err.response?.data?.message || 'Failed to load shared folders');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const accessSharedFolder = useCallback(async (folderId: string) => {
        const folderKeyStore = useFolderKeyStore.getState();
        if (folderKeyStore.getKey(folderId)) return folderKeyStore.getKey(folderId);

        try {
            const response = await apiClient.get(`/share/shared-folder/${folderId}`);
            const { encryptedSharedKey } = response.data;

            const { user } = useSessionStore.getState();
            if (!user?.privateKey) throw new Error('Private key not available');

            const key = await decapsulateFolderKey(encryptedSharedKey, user.privateKey);
            folderKeyStore.setKey(folderId, key);
            return key;
        } catch (err) {
            console.error('Failed to access shared folder:', err);
            throw err;
        }
    }, []);

    return {
        sharedFolders,
        isLoading,
        error,
        fetchSharedFolders,
        accessSharedFolder
    };
};

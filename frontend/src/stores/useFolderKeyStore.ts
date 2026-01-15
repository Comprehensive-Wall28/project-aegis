import { create } from 'zustand';
import folderService from '@/services/folderService';
import apiClient from '@/services/api';
import { useSessionStore } from './sessionStore';
import { unwrapKey, decapsulateFolderKey } from '@/lib/cryptoUtils';

interface FolderKeyState {
    // Maps folderId to CryptoKey
    keys: Map<string, CryptoKey>;

    // Actions
    setKey: (folderId: string, key: CryptoKey) => void;
    getKey: (folderId: string) => CryptoKey | undefined;
    getOrFetchKey: (folderId: string) => Promise<CryptoKey>;
    clearKeys: () => void;
}

export const useFolderKeyStore = create<FolderKeyState>((set, get) => ({
    keys: new Map(),

    setKey: (folderId, key) => {
        set((state) => {
            const newMap = new Map(state.keys);
            newMap.set(folderId, key);
            return { keys: newMap };
        });
    },

    getKey: (folderId) => {
        return get().keys.get(folderId);
    },

    getOrFetchKey: async (folderId) => {
        const existing = get().keys.get(folderId);
        if (existing) return existing;

        try {
            // First check the folder metadata (which may include encryptedSessionKey if we own it)
            const folder = await folderService.getFolder(folderId);
            const { user } = useSessionStore.getState();
            const masterKey = user?.vaultKey;

            if (!masterKey || !user?.privateKey) {
                throw new Error('Vault keys not initialized');
            }

            let key: CryptoKey;

            if (folder.ownerId === user._id && folder.encryptedSessionKey) {
                // Folder we own (wrapped with our vaultKey)
                key = await unwrapKey(folder.encryptedSessionKey, masterKey, 'AES-GCM');
            } else {
                // Shared folder: Fetch the encryptedSharedKey (PQC)
                const response = await apiClient.get(`/share/shared-folder/${folderId}`);
                const { encryptedSharedKey } = response.data;
                key = await decapsulateFolderKey(encryptedSharedKey, user.privateKey);
            }


            get().setKey(folderId, key);
            return key;
        } catch (err) {
            console.error('Failed to resolve folder key:', err);
            throw new Error('Could not access folder encryption key');
        }
    },

    clearKeys: () => {
        set({ keys: new Map() });
    }
}));


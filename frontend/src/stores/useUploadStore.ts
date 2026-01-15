import { create } from 'zustand';
import { useSessionStore } from './sessionStore';
import { useFolderKeyStore } from './useFolderKeyStore';
import apiClient from '../services/api';
import { generateDEK, wrapKey, bytesToHex } from '../lib/cryptoUtils';

// Constants
const CHUNK_SIZE = 5 * 1024 * 1024 - 16; // ~5MB raw, exactly 5MB after adding 16-byte IV
const MAX_CONCURRENT_UPLOADS = 3;

// Types
export type UploadItemStatus = 'pending' | 'encrypting' | 'uploading' | 'completed' | 'error';

export interface UploadItem {
    id: string;
    file: File;
    folderId: string | null;
    status: UploadItemStatus;
    progress: number;
    error: string | null;
}

export interface GlobalUploadState {
    status: 'idle' | 'uploading' | 'completed' | 'error';
    progress: number;
}

interface UploadState {
    uploads: Map<string, UploadItem>;
    activeCount: number;
    processing: boolean;

    // Actions
    uploadFiles: (files: File[], folderId?: string | null) => void;
    updateUploadItem: (id: string, updates: Partial<UploadItem>) => void;
    processQueue: () => void;
    clearCompleted: () => void;

    // Derived values (computed at runtime in components or via helpers)
    getActiveUploads: () => UploadItem[];
    getGlobalState: () => GlobalUploadState;
}

// Helper functions (defined in cryptoUtils)

/**
 * Encrypt data using AES-CTR with the global vault key.
 * Returns IV (16 bytes) + Ciphertext.
 */
const encryptWithCtr = async (
    data: ArrayBuffer,
    key: CryptoKey
): Promise<ArrayBuffer> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(16));

    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: 'AES-CTR',
            counter: iv,
            length: 64 // Counter block uses lower 64 bits
        },
        key,
        data
    );

    // Prepend IV to ciphertext
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    return result.buffer;
};

export const useUploadStore = create<UploadState>((set, get) => ({
    uploads: new Map(),
    activeCount: 0,
    processing: false,

    updateUploadItem: (id, updates) => {
        set((state) => {
            const newMap = new Map(state.uploads);
            const item = newMap.get(id);
            if (item) {
                newMap.set(id, { ...item, ...updates });
            }
            return { uploads: newMap };
        });
    },

    uploadFiles: (files, folderId) => {
        const newItems: UploadItem[] = files.map((file) => ({
            id: crypto.randomUUID(),
            file,
            folderId: folderId ?? null,
            status: 'pending',
            progress: 0,
            error: null
        }));

        set((state) => {
            const newMap = new Map(state.uploads);
            newItems.forEach((item) => newMap.set(item.id, item));
            return { uploads: newMap };
        });

        // Trigger processing
        get().processQueue();
    },

    processQueue: async () => {
        const state = get();
        if (state.processing) return;

        const pendingItems = Array.from(state.uploads.values())
            .filter((item) => item.status === 'pending');

        if (pendingItems.length === 0) return;

        // Use a local variable to track active count within this iteration
        // to prevent race conditions before state updates
        let currentActive = state.activeCount;
        if (currentActive >= MAX_CONCURRENT_UPLOADS) return;

        set({ processing: true });

        // Start uploads up to concurrency limit
        for (const item of pendingItems) {
            if (currentActive >= MAX_CONCURRENT_UPLOADS) break;

            currentActive++;
            set((s) => ({ activeCount: s.activeCount + 1 }));

            // Start upload (don't await - run concurrently)
            (async () => {
                const { user, vaultCtrKey, setCryptoStatus } = useSessionStore.getState();
                const masterKey = user?.vaultKey;

                if (!vaultCtrKey || !masterKey) {
                    get().updateUploadItem(item.id, {
                        status: 'error',
                        error: 'Vault keys not ready. Please wait or log in again.'
                    });
                    set((s) => ({ activeCount: Math.max(0, s.activeCount - 1) }));
                    return;
                }

                try {
                    setCryptoStatus('encrypting');
                    get().updateUploadItem(item.id, { status: 'encrypting', progress: 0 });

                    // 1. Generate per-file DEK (Data Encryption Key)
                    const dek = await generateDEK();

                    // 2. Resolve Master/Folder Key for wrapping the DEK
                    let wrapWithKey = masterKey;
                    let encapsulatedKey = 'AES-KW';

                    if (item.folderId) {
                        try {
                            wrapWithKey = await useFolderKeyStore.getState().getOrFetchKey(item.folderId);
                            encapsulatedKey = 'FOLDER'; // Backend recognizes this as folder-level wrapping
                        } catch (folderErr) {
                            console.warn('Folder key not available, falling back to Master Key:', folderErr);
                            // Fallback to masterKey is already default
                        }
                    }

                    // 3. Wrap DEK
                    const encryptedDEK = await wrapKey(dek, wrapWithKey);

                    // 1. Encrypt filename using AES-CTR with global key
                    const nameIv = window.crypto.getRandomValues(new Uint8Array(16));
                    const nameEnc = await window.crypto.subtle.encrypt(
                        { name: 'AES-CTR', counter: nameIv, length: 64 },
                        vaultCtrKey,
                        new TextEncoder().encode(item.file.name)
                    );
                    const encryptedFileName = bytesToHex(nameIv) + ':' + bytesToHex(new Uint8Array(nameEnc));

                    // 2. Calculate Encrypted Size (16-byte IV overhead per chunk)
                    const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE);
                    const overheadPerChunk = 16;
                    const totalEncryptedSize = item.file.size + (totalChunks * overheadPerChunk);

                    // 3. Send Init
                    const initResponse = await apiClient.post('/vault/upload-init', {
                        fileName: encryptedFileName,
                        originalFileName: item.file.name,
                        fileSize: totalEncryptedSize,
                        encryptedSymmetricKey: encryptedDEK,
                        encapsulatedKey: encapsulatedKey,
                        mimeType: item.file.type || 'application/octet-stream',
                        folderId: item.folderId
                    });


                    const { fileId } = initResponse.data;

                    // 4. Encrypt & Upload Chunks
                    get().updateUploadItem(item.id, { status: 'uploading', progress: 0 });

                    let uploadedBytes = 0;
                    let uploadedEncryptedBytes = 0;
                    const totalSize = item.file.size;

                    while (uploadedBytes < totalSize) {
                        const end = Math.min(uploadedBytes + CHUNK_SIZE, totalSize);
                        const chunkBlob = item.file.slice(uploadedBytes, end);
                        const chunkArrayBuffer = await chunkBlob.arrayBuffer();

                        // Encrypt chunk with per-file DEK
                        const encryptedChunk = await encryptWithCtr(chunkArrayBuffer, dek);

                        // Calculate Content-Range
                        const currentEncryptedChunkSize = encryptedChunk.byteLength;
                        const rangeStart = uploadedEncryptedBytes;
                        const rangeEnd = rangeStart + currentEncryptedChunkSize - 1;

                        const contentRange = `bytes ${rangeStart}-${rangeEnd}/${totalEncryptedSize}`;

                        // Upload Chunk
                        await apiClient.put(`/vault/upload-chunk?fileId=${fileId}`, encryptedChunk, {
                            headers: {
                                'Content-Type': 'application/octet-stream',
                                'Content-Range': contentRange
                            },
                            validateStatus: (status) => status === 200 || status === 308
                        });

                        uploadedBytes = end;
                        uploadedEncryptedBytes += currentEncryptedChunkSize;

                        const percent = Math.round((uploadedBytes / totalSize) * 100);

                        // Throttle progress updates to avoid overwhelming the UI
                        const currentItem = get().uploads.get(item.id);
                        if (percent === 100 || !currentItem || percent !== currentItem.progress) {
                            // Only update if it's a significant change or 100%
                            // Add a small delay/throttle if needed, but per-chunk 5MB is already somewhat throttled.
                            // However, for many small chunks, we should be careful.
                            get().updateUploadItem(item.id, { progress: percent });
                        }
                    }

                    // 6. Complete
                    get().updateUploadItem(item.id, { status: 'completed', progress: 100 });

                } catch (err: any) {
                    console.error(`Upload failed for ${item.file.name}:`, err);
                    get().updateUploadItem(item.id, {
                        status: 'error',
                        progress: 0,
                        error: err.message || 'Upload failed'
                    });
                } finally {
                    setCryptoStatus('idle');
                    set((s) => ({ activeCount: Math.max(0, s.activeCount - 1) }));
                    // Check if more items are pending
                    get().processQueue();
                }
            })();
        }

        set({ processing: false });
    },

    clearCompleted: () => {
        set((state) => {
            const newMap = new Map(state.uploads);
            for (const [id, item] of newMap) {
                if (item.status === 'completed' || item.status === 'error') {
                    newMap.delete(id);
                }
            }
            return { uploads: newMap };
        });
    },

    getActiveUploads: () => {
        return Array.from(get().uploads.values());
    },

    getGlobalState: () => {
        const items = Array.from(get().uploads.values());

        if (items.length === 0) {
            return { status: 'idle', progress: 0 };
        }

        const hasError = items.some(item => item.status === 'error');
        const allCompleted = items.every(item => item.status === 'completed');
        const isUploading = items.some(item =>
            item.status === 'pending' || item.status === 'encrypting' || item.status === 'uploading'
        );

        const totalProgress = items.reduce((sum, item) => sum + item.progress, 0);
        const avgProgress = Math.round(totalProgress / items.length);

        if (allCompleted) {
            return { status: 'completed', progress: 100 };
        }
        if (hasError && !isUploading) {
            return { status: 'error', progress: avgProgress };
        }
        if (isUploading) {
            return { status: 'uploading', progress: avgProgress };
        }

        return { status: 'idle', progress: 0 };
    }
}));

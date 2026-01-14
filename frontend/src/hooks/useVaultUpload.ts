import { useState, useRef, useCallback, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import apiClient from '../services/api';


// Constants
// AES-CTR adds only 16-byte IV overhead (no auth tag like GCM)
// Using 5MB chunks aligned for Google Drive resumable uploads
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

// Legacy state interface for backward compatibility
interface VaultUploadState {
    status: 'idle' | 'encrypting' | 'uploading' | 'verifying' | 'completed' | 'error';
    progress: number;
    error: string | null;
}

export const useVaultUpload = () => {
    // Upload items stored as Map for efficient updates by ID
    const [uploads, setUploads] = useState<Map<string, UploadItem>>(new Map());

    // Track active upload count
    const activeCountRef = useRef(0);

    // Queue processing lock to prevent race conditions
    const processingRef = useRef(false);

    const { vaultCtrKey, setCryptoStatus } = useSessionStore();

    // Helper: Convert Uint8Array to Hex
    const bytesToHex = (bytes: Uint8Array): string => {
        return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    };

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

    // Update a specific upload item in the map
    const updateUploadItem = useCallback((id: string, updates: Partial<UploadItem>) => {
        setUploads(prev => {
            const newMap = new Map(prev);
            const item = newMap.get(id);
            if (item) {
                newMap.set(id, { ...item, ...updates });
            }
            return newMap;
        });
    }, []);

    // Process a single upload item (worker function)
    const processUploadItem = useCallback(async (item: UploadItem) => {
        if (!vaultCtrKey) {
            updateUploadItem(item.id, {
                status: 'error',
                error: 'Vault CTR key not found. Please log in again.'
            });
            return;
        }

        try {
            setCryptoStatus('encrypting');
            updateUploadItem(item.id, { status: 'encrypting', progress: 0 });

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
            const overheadPerChunk = 16; // AES-CTR IV only, no auth tag
            const totalEncryptedSize = item.file.size + (totalChunks * overheadPerChunk);

            // 3. Send Init (Eco-Mode markers)
            const initResponse = await apiClient.post('/vault/upload-init', {
                fileName: encryptedFileName,
                originalFileName: item.file.name,
                fileSize: totalEncryptedSize,
                encryptedSymmetricKey: 'GLOBAL', // Eco-Mode: uses global key
                encapsulatedKey: 'AES-CTR-V1', // Eco-Mode version marker
                mimeType: item.file.type || 'application/octet-stream',
                folderId: item.folderId
            });

            const { fileId } = initResponse.data;

            // 4. Encrypt & Upload Chunks using AES-CTR
            updateUploadItem(item.id, { status: 'uploading', progress: 0 });

            let uploadedBytes = 0;
            let uploadedEncryptedBytes = 0;
            const totalSize = item.file.size;

            while (uploadedBytes < totalSize) {
                const end = Math.min(uploadedBytes + CHUNK_SIZE, totalSize);
                const chunkBlob = item.file.slice(uploadedBytes, end);
                const chunkArrayBuffer = await chunkBlob.arrayBuffer();

                // Encrypt chunk with AES-CTR
                const encryptedChunk = await encryptWithCtr(chunkArrayBuffer, vaultCtrKey);

                // Calculate Content-Range based on ENCRYPTED data
                const currentEncryptedChunkSize = encryptedChunk.byteLength;
                const rangeStart = uploadedEncryptedBytes;
                const rangeEnd = rangeStart + currentEncryptedChunkSize - 1;

                const contentRange = `bytes ${rangeStart}-${rangeEnd}/${totalEncryptedSize}`;

                // Upload Chunk (308 = Resume Incomplete, continue uploading)
                await apiClient.put(`/vault/upload-chunk?fileId=${fileId}`, encryptedChunk, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Range': contentRange
                    },
                    validateStatus: (status) => status === 200 || status === 308
                });

                uploadedBytes = end;
                uploadedEncryptedBytes += currentEncryptedChunkSize;

                // Update progress for this specific file
                const percent = Math.round((uploadedBytes / totalSize) * 100);
                updateUploadItem(item.id, { progress: percent });
            }

            // 6. Complete
            updateUploadItem(item.id, { status: 'completed', progress: 100 });

        } catch (err: any) {
            console.error(`Upload failed for ${item.file.name}:`, err);
            updateUploadItem(item.id, {
                status: 'error',
                progress: 0,
                error: err.message || 'Upload failed'
            });
        } finally {
            setCryptoStatus('idle');
        }
    }, [vaultCtrKey, setCryptoStatus, updateUploadItem]);

    // Process the upload queue - uses functional update to get fresh state
    const processQueue = useCallback(() => {
        // Prevent concurrent queue processing
        if (processingRef.current) return;
        processingRef.current = true;

        setUploads(currentUploads => {
            // Find pending items from current state
            const pendingItems = Array.from(currentUploads.values())
                .filter(item => item.status === 'pending');

            // Start uploads up to concurrency limit
            for (const item of pendingItems) {
                if (activeCountRef.current >= MAX_CONCURRENT_UPLOADS) break;

                activeCountRef.current++;

                // Start upload (don't await - run concurrently)
                processUploadItem(item).finally(() => {
                    activeCountRef.current--;
                    // Schedule next queue check
                    processingRef.current = false;
                    processQueue();
                });
            }

            processingRef.current = false;
            return currentUploads; // Return unchanged
        });
    }, [processUploadItem]);

    // Watch for new uploads and trigger queue processing
    useEffect(() => {
        const hasPending = Array.from(uploads.values()).some(u => u.status === 'pending');
        if (hasPending && activeCountRef.current < MAX_CONCURRENT_UPLOADS) {
            processQueue();
        }
    }, [uploads, processQueue]);

    // Add multiple files to the upload queue
    const uploadFiles = useCallback((files: File[], folderId?: string | null) => {
        const newItems: UploadItem[] = files.map(file => ({
            id: crypto.randomUUID(),
            file,
            folderId: folderId ?? null,
            status: 'pending' as UploadItemStatus,
            progress: 0,
            error: null
        }));

        setUploads(prev => {
            const newMap = new Map(prev);
            newItems.forEach(item => newMap.set(item.id, item));
            return newMap;
        });
        // Queue processing will be triggered by useEffect watching uploads
    }, []);

    // Single file upload (backward compatibility)
    const uploadFile = useCallback((file: File, folderId?: string | null) => {
        uploadFiles([file], folderId);
    }, [uploadFiles]);

    // Clear completed/errored uploads
    const clearCompleted = useCallback(() => {
        setUploads(prev => {
            const newMap = new Map(prev);
            for (const [id, item] of newMap) {
                if (item.status === 'completed' || item.status === 'error') {
                    newMap.delete(id);
                }
            }
            return newMap;
        });
    }, []);

    // Derive active uploads list
    const activeUploads: UploadItem[] = Array.from(uploads.values());

    // Derive global state for backward compatibility
    const globalState: GlobalUploadState = (() => {
        const items = Array.from(uploads.values());

        if (items.length === 0) {
            return { status: 'idle', progress: 0 };
        }

        const hasError = items.some(item => item.status === 'error');
        const allCompleted = items.every(item => item.status === 'completed');
        const isUploading = items.some(item =>
            item.status === 'pending' || item.status === 'encrypting' || item.status === 'uploading'
        );

        // Calculate aggregate progress
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
    })();

    // Legacy state property for backward compatibility
    const state: VaultUploadState = {
        status: globalState.status === 'idle' ? 'idle'
            : globalState.status === 'completed' ? 'completed'
                : globalState.status === 'error' ? 'error'
                    : 'uploading',
        progress: globalState.progress,
        error: activeUploads.find(u => u.error)?.error ?? null
    };

    return {
        // New batch API
        uploadFiles,
        activeUploads,
        globalState,
        clearCompleted,

        // Legacy API (backward compatibility)
        uploadFile,
        state
    };
};

import { useState, useRef, useCallback, useEffect } from 'react';
// @ts-ignore - Module likely exists but types are missing in environment
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { useSessionStore } from '../stores/sessionStore';
import apiClient from '../services/api';


// Constants
// Google Drive resumable uploads require 256KB-aligned chunks
// Encryption adds 28 bytes (12 IV + 16 tag), so raw chunk = 5MB - 28 = 5242852
// This makes encrypted chunk exactly 5MB (5242880 bytes), which is 256KB aligned
const CHUNK_SIZE = 5 * 1024 * 1024 - 28; // ~5MB raw, exactly 5MB after encryption
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

    const { user, setCryptoStatus } = useSessionStore();

    // Helper: Convert Hex to Uint8Array
    const hexToBytes = (hex: string): Uint8Array => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes;
    };

    // Helper: Convert Uint8Array to Hex
    const bytesToHex = (bytes: Uint8Array): string => {
        return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    };

    const generateAESKey = async (): Promise<CryptoKey> => {
        return window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt']
        );
    };

    const encryptFileKey = async (fileKey: CryptoKey, sharedSecret: Uint8Array): Promise<string> => {
        const wrappingKey = await window.crypto.subtle.importKey(
            'raw',
            sharedSecret as any,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const rawFileKey = await window.crypto.subtle.exportKey('raw', fileKey);

        const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            wrappingKey,
            rawFileKey
        );

        // Format: IV (12 bytes) + EncryptedKey
        const result = new Uint8Array(iv.length + encryptedKeyBuffer.byteLength);
        result.set(iv);
        result.set(new Uint8Array(encryptedKeyBuffer), iv.length);

        return bytesToHex(result);
    };

    const encryptChunk = async (chunk: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> => {
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv as any,
            },
            key,
            chunk
        );

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
        if (!user || !user.publicKey) {
            updateUploadItem(item.id, {
                status: 'error',
                error: 'User public key not found. Session invalid?'
            });
            return;
        }

        try {
            setCryptoStatus('encrypting');
            updateUploadItem(item.id, { status: 'encrypting', progress: 0 });

            // 1. Generate AES-256 Key
            const fileKey = await generateAESKey();

            // 2. Encapsulate Key (PQC)
            const pubKeyBytes = hexToBytes(user.publicKey);
            const { cipherText: encapsulatedKey, sharedSecret } = ml_kem768.encapsulate(pubKeyBytes);

            // 3. Wrap AES Key
            const encryptedSymmetricKey = await encryptFileKey(fileKey, sharedSecret);

            // 4. Register Metadata (Upload Init)
            const nameIv = window.crypto.getRandomValues(new Uint8Array(12));
            const nameEnc = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: nameIv },
                fileKey,
                new TextEncoder().encode(item.file.name)
            );
            const encryptedFileName = bytesToHex(new Uint8Array(nameIv)) + ':' + bytesToHex(new Uint8Array(nameEnc));

            // Calculate Encrypted Size for Metadata and Content-Range
            const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE);
            const overheadPerChunk = 28;
            const totalEncryptedSize = item.file.size + (totalChunks * overheadPerChunk);

            // Send Init
            const initResponse = await apiClient.post('/vault/upload-init', {
                fileName: encryptedFileName,
                originalFileName: item.file.name,
                fileSize: totalEncryptedSize,
                encryptedSymmetricKey: encryptedSymmetricKey,
                encapsulatedKey: bytesToHex(encapsulatedKey),
                mimeType: item.file.type || 'application/octet-stream',
                folderId: item.folderId
            });

            const { fileId } = initResponse.data;

            // 5. Encrypt & Upload Chunks
            updateUploadItem(item.id, { status: 'uploading', progress: 0 });

            let uploadedBytes = 0;
            let uploadedEncryptedBytes = 0;
            const totalSize = item.file.size;

            while (uploadedBytes < totalSize) {
                const end = Math.min(uploadedBytes + CHUNK_SIZE, totalSize);
                const chunkBlob = item.file.slice(uploadedBytes, end);
                const chunkArrayBuffer = await chunkBlob.arrayBuffer();

                // Encrypt Chunk
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const encryptedChunk = await encryptChunk(chunkArrayBuffer, fileKey, iv);

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
    }, [user, setCryptoStatus, updateUploadItem]);

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

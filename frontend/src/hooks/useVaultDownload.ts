import { useState, useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { type FileMetadata, API_URL } from '../services/vaultService';
import { unwrapKey } from '../lib/cryptoUtils';
import { useFolderKeyStore } from '../stores/useFolderKeyStore';


// Constants - must match upload chunk sizes (AES-CTR: 16-byte IV overhead)
const ENCRYPTED_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB encrypted chunks

// User type for standalone function (only the keys we need)
export interface User {
    vaultCtrKey: CryptoKey;
    vaultKey: CryptoKey;
    privateKey?: string; // Hex PQC private key
}


interface VaultDownloadState {
    status: 'idle' | 'downloading' | 'decrypting' | 'completed' | 'error';
    progress: number;
    error: string | null;
}

/**
 * Decrypt an AES-CTR encrypted chunk.
 * Format: IV (16 bytes) + Ciphertext
 */
const decryptChunkCtr = async (encryptedChunk: Uint8Array, vaultCtrKey: CryptoKey): Promise<ArrayBuffer> => {
    // Extract IV (first 16 bytes) and encrypted content
    const iv = encryptedChunk.slice(0, 16);
    const encryptedContent = encryptedChunk.slice(16);

    // Decrypt chunk using AES-CTR
    return window.crypto.subtle.decrypt(
        { name: 'AES-CTR', counter: iv, length: 64 },
        vaultCtrKey,
        encryptedContent
    );
};

// Get CSRF token from cookie
const getCsrfToken = (): string | null => {
    const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
    return match ? match[2] : null;
};

/**
 * Standalone function to fetch and decrypt a file from the vault.
 * Uses AES-CTR Eco-Mode with global vault key for high-performance decryption.
 * 
 * @param file - The file metadata containing encryption info and file ID
 * @param user - The user object containing the vault CTR key for decryption
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Promise<Blob> - The decrypted file as a Blob
 * @throws Error if vault key is missing, download fails, or decryption fails
 */
export const fetchAndDecryptFile = async (
    file: FileMetadata,
    user: User,
    downloadUrl?: string,
    onProgress?: (progress: number) => void
): Promise<Blob> => {
    if (!user.vaultCtrKey || !user.vaultKey) {
        throw new Error('Vault keys not found. Please log in again.');
    }

    // 1. Resolve the Key Wrapping Key (KEK) - either Master Key or Folder Key
    let wrappingKey = user.vaultKey;
    if (file.encapsulatedKey === 'FOLDER' && file.folderId) {
        try {
            wrappingKey = await useFolderKeyStore.getState().getOrFetchKey(file.folderId);
        } catch (err) {
            console.error('Failed to fetch folder key for decryption:', err);
            throw new Error('Access denied or folder key not found');
        }
    }

    // 2. Unwrap DEK (Data Encryption Key)
    let dek: CryptoKey;
    if (file.encryptedSymmetricKey === 'GLOBAL') {
        // Legacy support
        dek = user.vaultCtrKey;
    } else {
        try {
            // Unwrapping a DEK (AES-CTR) using either Master Key or Folder Key (both are AES-GCM)
            dek = await unwrapKey(file.encryptedSymmetricKey, wrappingKey);
        } catch (err) {
            console.error('Failed to unwrap DEK:', err);
            throw new Error('Failed to decrypt file key. It may be corrupted or from an incompatible version.');
        }
    }


    // 2. Initiate streaming download using fetch
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = {};
    if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
    }

    const finalUrl = downloadUrl || `${API_URL}/vault/download/${file._id}`;

    const response = await fetch(finalUrl, {
        method: 'GET',
        credentials: 'include',
        headers
    });

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Response body is not readable');
    }

    const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);

    // 3. Stream and decrypt chunks using AES-CTR
    const decryptedChunks: ArrayBuffer[] = [];
    let encryptedBuffer = new Uint8Array(0);
    let totalBytesRead = 0;

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            // Process any remaining data as the last chunk
            if (encryptedBuffer.length > 0) {
                const decryptedChunk = await decryptChunkCtr(encryptedBuffer, dek);
                decryptedChunks.push(decryptedChunk);
            }
            break;
        }

        // Append new data to buffer
        const newBuffer = new Uint8Array(encryptedBuffer.length + value.length);
        newBuffer.set(encryptedBuffer);
        newBuffer.set(value, encryptedBuffer.length);
        encryptedBuffer = newBuffer;
        totalBytesRead += value.length;

        // Process complete chunks
        while (encryptedBuffer.length >= ENCRYPTED_CHUNK_SIZE) {
            const chunk = encryptedBuffer.slice(0, ENCRYPTED_CHUNK_SIZE);
            encryptedBuffer = encryptedBuffer.slice(ENCRYPTED_CHUNK_SIZE);

            const decryptedChunk = await decryptChunkCtr(chunk, dek);
            decryptedChunks.push(decryptedChunk);
        }

        // Update progress via callback
        if (onProgress && contentLength > 0) {
            const progress = Math.round((totalBytesRead / contentLength) * 100);
            onProgress(progress);
        }
    }

    // 4. Combine all decrypted chunks into final blob
    const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of decryptedChunks) {
        result.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }

    // Return as blob with original MIME type
    return new Blob([result], { type: file.mimeType });
};

// --- React Hook ---

export const useVaultDownload = () => {
    const [state, setState] = useState<VaultDownloadState>({
        status: 'idle',
        progress: 0,
        error: null,
    });

    const { vaultCtrKey, setCryptoStatus } = useSessionStore();

    const downloadAndDecrypt = useCallback(async (file: FileMetadata, downloadUrl?: string): Promise<Blob | null> => {
        const { user: sessionUser, vaultCtrKey, setCryptoStatus } = useSessionStore.getState();
        const vaultKey = sessionUser?.vaultKey;
        const privateKey = sessionUser?.privateKey;

        if (!vaultCtrKey || !vaultKey) {
            setState({ status: 'error', progress: 0, error: 'Vault keys not found. Please log in again.' });
            return null;
        }

        try {
            setCryptoStatus('decrypting');
            setState({ status: 'downloading', progress: 0, error: null });

            // Use the standalone function with progress callback
            const blob = await fetchAndDecryptFile(
                file,
                { vaultCtrKey, vaultKey, privateKey },
                downloadUrl,
                (progress) => {
                    setState(prev => ({
                        ...prev,
                        status: 'decrypting',
                        progress
                    }));
                }
            );

            setState({ status: 'completed', progress: 100, error: null });
            return blob;

        } catch (err: any) {
            console.error('Download/Decrypt failed:', err);
            setState({ status: 'error', progress: 0, error: err.message || 'Decryption failed' });
            return null;
        } finally {
            setCryptoStatus('idle');
        }
    }, [vaultCtrKey, setCryptoStatus]);

    const resetState = () => {
        setState({ status: 'idle', progress: 0, error: null });
    };

    return {
        downloadAndDecrypt,
        resetState,
        state
    };
};

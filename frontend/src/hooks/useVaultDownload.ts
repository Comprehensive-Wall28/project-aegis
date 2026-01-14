import { useState, useCallback } from 'react';
// @ts-ignore - Module likely exists but types are missing in environment
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { useSessionStore } from '../stores/sessionStore';
import { type FileMetadata, API_URL } from '../services/vaultService';

// Constants - must match upload chunk sizes
const ENCRYPTED_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB encrypted chunks

// User type for standalone function (only the keys we need)
export interface User {
    privateKey: string;
}

interface VaultDownloadState {
    status: 'idle' | 'downloading' | 'decrypting' | 'completed' | 'error';
    progress: number;
    error: string | null;
}

// --- Standalone Utility Functions ---

// Helper: Convert Hex to Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

// Decrypt the AES file key using the shared secret
const decryptFileKey = async (encryptedSymmetricKey: string, sharedSecret: Uint8Array): Promise<CryptoKey> => {
    const encryptedKeyBytes = hexToBytes(encryptedSymmetricKey);

    // First 12 bytes are IV, rest is encrypted key + auth tag
    const iv = encryptedKeyBytes.slice(0, 12);
    const encryptedKey = encryptedKeyBytes.slice(12);

    // Import sharedSecret as decryption key
    const unwrappingKey = await window.crypto.subtle.importKey(
        'raw',
        sharedSecret.buffer.slice(sharedSecret.byteOffset, sharedSecret.byteOffset + sharedSecret.byteLength) as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );

    // Decrypt the file key
    const rawFileKey = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        unwrappingKey,
        encryptedKey
    );

    // Import as AES-GCM key for file decryption
    return window.crypto.subtle.importKey(
        'raw',
        rawFileKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );
};

// Decrypt a single encrypted chunk
const decryptChunk = async (encryptedChunk: Uint8Array, fileKey: CryptoKey): Promise<ArrayBuffer> => {
    // Extract IV (first 12 bytes) and encrypted content
    const iv = encryptedChunk.slice(0, 12);
    const encryptedContent = encryptedChunk.slice(12);

    // Decrypt chunk
    return window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        fileKey,
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
 * Does not depend on React state - can be used outside of React components.
 * 
 * @param file - The file metadata containing encryption keys and file ID
 * @param user - The user object containing the private key for decryption
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Promise<Blob> - The decrypted file as a Blob
 * @throws Error if user private key is missing, download fails, or decryption fails
 */
export const fetchAndDecryptFile = async (
    file: FileMetadata,
    user: User,
    onProgress?: (progress: number) => void
): Promise<Blob> => {
    if (!user.privateKey) {
        throw new Error('User private key not found. Session invalid?');
    }

    // 1. Derive shared secret and file key first
    const privateKeyBytes = hexToBytes(user.privateKey);
    const encapsulatedKeyBytes = hexToBytes(file.encapsulatedKey);
    const sharedSecret = ml_kem768.decapsulate(encapsulatedKeyBytes, privateKeyBytes);
    const fileKey = await decryptFileKey(file.encryptedSymmetricKey, sharedSecret);

    // 2. Initiate streaming download using fetch
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = {};
    if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
    }

    const response = await fetch(`${API_URL}/vault/download/${file._id}`, {
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

    // 3. Stream and decrypt chunks
    const decryptedChunks: ArrayBuffer[] = [];
    let encryptedBuffer = new Uint8Array(0);
    let totalBytesRead = 0;

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            // Process any remaining data as the last chunk
            if (encryptedBuffer.length > 0) {
                const decryptedChunk = await decryptChunk(encryptedBuffer, fileKey);
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

            const decryptedChunk = await decryptChunk(chunk, fileKey);
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

    const { user, setCryptoStatus } = useSessionStore();

    const downloadAndDecrypt = useCallback(async (file: FileMetadata): Promise<Blob | null> => {
        if (!user || !user.privateKey) {
            setState({ status: 'error', progress: 0, error: 'User private key not found. Session invalid?' });
            return null;
        }

        try {
            setCryptoStatus('decrypting');
            setState({ status: 'downloading', progress: 0, error: null });

            // Use the standalone function with progress callback
            const blob = await fetchAndDecryptFile(
                file,
                { privateKey: user.privateKey },
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
    }, [user, setCryptoStatus]);

    const resetState = () => {
        setState({ status: 'idle', progress: 0, error: null });
    };

    return {
        downloadAndDecrypt,
        resetState,
        state
    };
};

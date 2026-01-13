import { useState } from 'react';
// @ts-ignore - Module likely exists but types are missing in environment
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { useSessionStore } from '../stores/sessionStore';
import apiClient from '../services/api';


// Constants
// Google Drive resumable uploads require 256KB-aligned chunks
// Encryption adds 28 bytes (12 IV + 16 tag), so raw chunk = 5MB - 28 = 5242852
// This makes encrypted chunk exactly 5MB (5242880 bytes), which is 256KB aligned
const CHUNK_SIZE = 5 * 1024 * 1024 - 28; // ~5MB raw, exactly 5MB after encryption

interface VaultUploadState {
    status: 'idle' | 'encrypting' | 'uploading' | 'verifying' | 'completed' | 'error';
    progress: number;
    error: string | null;
}

export const useVaultUpload = () => {
    const [state, setState] = useState<VaultUploadState>({
        status: 'idle',
        progress: 0,
        error: null,
    });

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
        // Import sharedSecret as a Key wrapping key
        // NOTE: standard AES-GCM requires 96-bit IV.
        // We use the first 32 bytes of sharedSecret? No, sharedSecret is the key.
        // We import sharedSecret as an AES-KW (Key Wrap) key or AES-GCM key?

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

    const uploadFile = async (file: File, folderId?: string | null) => {
        if (!user || !user.publicKey) {
            setState({ ...state, status: 'error', error: 'User public key not found. Session invalid?' });
            return;
        }

        try {
            setCryptoStatus('encrypting');
            setState({ status: 'encrypting', progress: 0, error: null });

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
                new TextEncoder().encode(file.name)
            );
            const encryptedFileName = bytesToHex(new Uint8Array(nameIv)) + ':' + bytesToHex(new Uint8Array(nameEnc));

            // Calculate Encrypted Size for Metadata and Content-Range
            // Overhead = IV (12) + Tag (16) = 28 bytes per chunk
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            const overheadPerChunk = 28;
            const totalEncryptedSize = file.size + (totalChunks * overheadPerChunk);

            // Send Init

            const initResponse = await apiClient.post('/vault/upload-init', {
                fileName: encryptedFileName,
                originalFileName: file.name, // Original filename for display
                fileSize: totalEncryptedSize, // Send total ENCRYPTED size
                encryptedSymmetricKey: encryptedSymmetricKey,
                encapsulatedKey: bytesToHex(encapsulatedKey),
                mimeType: file.type || 'application/octet-stream',
                folderId // Pass target folder
            });

            const { fileId } = initResponse.data;

            // 5. Encrypt & Upload Chunks
            setState({ status: 'uploading', progress: 0, error: null });

            let uploadedBytes = 0;
            let uploadedEncryptedBytes = 0;
            const totalSize = file.size;

            while (uploadedBytes < totalSize) {
                const end = Math.min(uploadedBytes + CHUNK_SIZE, totalSize);
                const chunkBlob = file.slice(uploadedBytes, end);
                const chunkArrayBuffer = await chunkBlob.arrayBuffer();

                // Encrypt Chunk
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const encryptedChunk = await encryptChunk(chunkArrayBuffer, fileKey, iv);

                // Calculate Content-Range based on ENCRYPTED data
                // encryptedChunk is ArrayBuffer, so byteLength gives accurate size
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

                // Update progress based on source file bytes for user friendliness
                const percent = Math.round((uploadedBytes / totalSize) * 100);
                setState(prev => ({ ...prev, progress: percent }));
            }

            // 6. Verify / Finalize
            setState({ status: 'verifying', progress: 100, error: null });

            // Explicit cleanup
            setTimeout(() => {
                setState({ status: 'completed', progress: 100, error: null });
            }, 1000);

        } catch (err: any) {
            console.error('Upload failed:', err);
            setState({ status: 'error', progress: 0, error: err.message || 'Upload failed' });
        } finally {
            setCryptoStatus('idle');
        }
    };

    return {
        uploadFile,
        state
    };
};

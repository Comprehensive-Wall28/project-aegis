import { useState } from 'react';
// @ts-ignore - Module likely exists but types are missing in environment
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { useSessionStore } from '../stores/sessionStore';
import vaultService, { type FileMetadata } from '../services/vaultService';

interface VaultDownloadState {
    status: 'idle' | 'downloading' | 'decrypting' | 'completed' | 'error';
    progress: number;
    error: string | null;
}

export const useVaultDownload = () => {
    const [state, setState] = useState<VaultDownloadState>({
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

    // Decrypt file content (handles chunked encryption)
    const decryptFileContent = async (encryptedData: ArrayBuffer, fileKey: CryptoKey): Promise<ArrayBuffer> => {
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB original chunk size
        const ENCRYPTED_CHUNK_OVERHEAD = 28; // IV (12) + Auth Tag (16)
        const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + ENCRYPTED_CHUNK_OVERHEAD;

        const encryptedBytes = new Uint8Array(encryptedData);
        const decryptedChunks: ArrayBuffer[] = [];

        let offset = 0;
        while (offset < encryptedBytes.length) {
            // Determine chunk size (last chunk may be smaller)
            const remainingBytes = encryptedBytes.length - offset;
            const chunkSize = Math.min(ENCRYPTED_CHUNK_SIZE, remainingBytes);
            const chunk = encryptedBytes.slice(offset, offset + chunkSize);

            // Extract IV (first 12 bytes) and encrypted content
            const iv = chunk.slice(0, 12);
            const encryptedContent = chunk.slice(12);

            // Decrypt chunk
            const decryptedChunk = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                fileKey,
                encryptedContent
            );

            decryptedChunks.push(decryptedChunk);
            offset += chunkSize;
        }

        // Concatenate all decrypted chunks
        const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const result = new Uint8Array(totalLength);
        let resultOffset = 0;
        for (const chunk of decryptedChunks) {
            result.set(new Uint8Array(chunk), resultOffset);
            resultOffset += chunk.byteLength;
        }

        return result.buffer;
    };

    const downloadAndDecrypt = async (file: FileMetadata): Promise<Blob | null> => {
        if (!user || !user.privateKey) {
            setState({ status: 'error', progress: 0, error: 'User private key not found. Session invalid?' });
            return null;
        }

        try {
            setCryptoStatus('decrypting');
            setState({ status: 'downloading', progress: 0, error: null });

            // 1. Download encrypted file
            const encryptedBlob = await vaultService.downloadFile(file._id);
            const encryptedArrayBuffer = await encryptedBlob.arrayBuffer();

            setState({ status: 'decrypting', progress: 50, error: null });

            // 2. Decapsulate to get shared secret using private key
            const privateKeyBytes = hexToBytes(user.privateKey);
            const encapsulatedKeyBytes = hexToBytes(file.encapsulatedKey);
            const sharedSecret = ml_kem768.decapsulate(encapsulatedKeyBytes, privateKeyBytes);

            // 3. Decrypt the file key
            const fileKey = await decryptFileKey(file.encryptedSymmetricKey, sharedSecret);

            // 4. Decrypt file content
            const decryptedContent = await decryptFileContent(encryptedArrayBuffer, fileKey);

            setState({ status: 'completed', progress: 100, error: null });

            // Return as blob with original MIME type
            return new Blob([decryptedContent], { type: file.mimeType });

        } catch (err: any) {
            console.error('Download/Decrypt failed:', err);
            setState({ status: 'error', progress: 0, error: err.message || 'Decryption failed' });
            return null;
        } finally {
            setCryptoStatus('idle');
        }
    };

    const resetState = () => {
        setState({ status: 'idle', progress: 0, error: null });
    };

    return {
        downloadAndDecrypt,
        resetState,
        state
    };
};

import { useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import {
    bytesToHex,
    hexToBytes
} from '../lib/cryptoUtils';
// @ts-ignore
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

/**
 * Note content structure (JSON from TipTap editor)
 */
export interface NoteContent {
    type: 'doc';
    content: any[];
}

/**
 * Encrypted note payload for sending to backend
 */
export interface EncryptedNotePayload {
    encryptedContent: string;       // Base64 encoded encrypted content
    encapsulatedKey: string;        // ML-KEM-768 ciphertext (hex)
    encryptedSymmetricKey: string;  // IV + wrapped AES key (hex)
}

/**
 * Decrypted response from backend
 */
export interface DecryptedNoteData {
    content: NoteContent;
}

/**
 * Hook for encrypting and decrypting note content using ML-KEM-768 + AES-256-GCM
 */
export const useNoteEncryption = () => {
    const { user, setCryptoStatus } = useSessionStore();

    /**
     * Encrypt note content (TipTap JSON) for storage
     */
    const encryptNoteContent = useCallback(async (content: NoteContent): Promise<EncryptedNotePayload> => {
        if (!user || !user.publicKey) {
            throw new Error('User public key not found. PQC Engine must be operational.');
        }

        try {
            setCryptoStatus('encrypting');

            // Generate a random AES-256-GCM key for this note
            const aesKey = await window.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Encapsulate using ML-KEM-768 to get shared secret
            const pubKeyBytes = hexToBytes(user.publicKey);
            const { cipherText: encapsulatedKey, sharedSecret } = ml_kem768.encapsulate(pubKeyBytes);

            // Create wrapping key from shared secret
            const wrappingKey = await window.crypto.subtle.importKey(
                'raw',
                sharedSecret.buffer.slice(
                    sharedSecret.byteOffset,
                    sharedSecret.byteOffset + sharedSecret.byteLength
                ) as ArrayBuffer,
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );

            // Wrap the AES key with the shared secret
            const ivKey = window.crypto.getRandomValues(new Uint8Array(12));
            const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);

            const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: ivKey },
                wrappingKey,
                rawKey
            );

            const encryptedSymmetricKey = bytesToHex(ivKey) + bytesToHex(new Uint8Array(encryptedKeyBuffer));

            // Encrypt the note content with the AES key
            const contentJson = JSON.stringify(content);
            const contentBytes = new TextEncoder().encode(contentJson);
            const ivData = window.crypto.getRandomValues(new Uint8Array(12));

            const encryptedDataBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: ivData },
                aesKey,
                contentBytes
            );

            // Combine IV + ciphertext and encode as base64
            const combined = new Uint8Array(ivData.length + encryptedDataBuffer.byteLength);
            combined.set(ivData);
            combined.set(new Uint8Array(encryptedDataBuffer), ivData.length);

            // Convert to base64 for transport
            const encryptedContent = btoa(String.fromCharCode(...combined));

            return {
                encryptedContent,
                encapsulatedKey: bytesToHex(encapsulatedKey),
                encryptedSymmetricKey,
            };
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus]);

    /**
     * Decrypt note content from backend response
     */
    const decryptNoteContent = useCallback(async (
        encryptedContent: string,
        encapsulatedKey: string,
        encryptedSymmetricKey: string
    ): Promise<NoteContent> => {
        if (!user || !user.privateKey) {
            throw new Error('User private key not found. PQC Engine must be operational.');
        }

        try {
            setCryptoStatus('decrypting');

            // Decapsulate to get shared secret
            const privKeyBytes = hexToBytes(user.privateKey);
            const encapsulatedKeyBytes = hexToBytes(encapsulatedKey);
            const sharedSecret = ml_kem768.decapsulate(encapsulatedKeyBytes, privKeyBytes);

            // Unwrap the AES key
            const encKeyHex = encryptedSymmetricKey;
            const ivKeyHex = encKeyHex.slice(0, 24);
            const cipherKeyHex = encKeyHex.slice(24);
            const ivKey = hexToBytes(ivKeyHex);
            const cipherKey = hexToBytes(cipherKeyHex);

            const unwrappingKey = await window.crypto.subtle.importKey(
                'raw',
                sharedSecret.buffer.slice(
                    sharedSecret.byteOffset,
                    sharedSecret.byteOffset + sharedSecret.byteLength
                ) as ArrayBuffer,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            const rawAesKey = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivKey as unknown as BufferSource },
                unwrappingKey,
                cipherKey as unknown as BufferSource
            );

            const aesKey = await window.crypto.subtle.importKey(
                'raw',
                rawAesKey,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // Decode base64 content
            const binaryString = atob(encryptedContent);
            const combined = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                combined[i] = binaryString.charCodeAt(i);
            }

            // Extract IV and ciphertext
            const ivData = combined.slice(0, 12);
            const cipherData = combined.slice(12);

            // Decrypt the content
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(ivData) },
                aesKey,
                new Uint8Array(cipherData)
            );

            const contentJson = new TextDecoder().decode(decryptedBuffer);
            return JSON.parse(contentJson) as NoteContent;
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus]);

    /**
     * Generate a record hash for integrity verification
     */
    const generateNoteHash = useCallback(async (
        content: NoteContent,
        tags: string[] = []
    ): Promise<string> => {
        const hashContent = `${JSON.stringify(content)}|${tags.sort().join(',')}`;
        const msgUint8 = new TextEncoder().encode(hashContent);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }, []);

    return {
        encryptNoteContent,
        decryptNoteContent,
        generateNoteHash,
    };
};

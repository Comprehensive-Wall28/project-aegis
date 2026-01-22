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
    encryptedTitle?: string;        // Optional encrypted title
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
     * Derive AES key from encapsulated and wrapped keys
     */
    const deriveAesKey = useCallback(async (
        encapsulatedKey: string,
        encryptedSymmetricKey: string
    ): Promise<CryptoKey> => {
        if (!user || !user.privateKey) {
            throw new Error('User private key not found. PQC Engine must be operational.');
        }

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

        return await window.crypto.subtle.importKey(
            'raw',
            rawAesKey,
            { name: 'AES-GCM' },
            false,
            ['decrypt', 'encrypt']
        );
    }, [user]);

    /**
     * Encrypt note content and title together
     */
    const encryptNote = useCallback(async (content: NoteContent, title?: string): Promise<EncryptedNotePayload> => {
        if (!user || !user.publicKey) {
            throw new Error('User public key not found. PQC Engine must be operational.');
        }

        try {
            setCryptoStatus('encrypting');

            // 1. Generate AES-256-GCM key
            const aesKey = await window.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // 2. Encapsulate with ML-KEM-768
            const pubKeyBytes = hexToBytes(user.publicKey);
            const { cipherText: encapsulatedKeyBytes, sharedSecret } = ml_kem768.encapsulate(pubKeyBytes);

            // 3. Create wrapping key and wrap AES key
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

            const ivKey = window.crypto.getRandomValues(new Uint8Array(12));
            const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);
            const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: ivKey },
                wrappingKey,
                rawKey
            );
            const encryptedSymmetricKey = bytesToHex(ivKey) + bytesToHex(new Uint8Array(encryptedKeyBuffer));

            // 4. Encrypt content
            const contentJson = JSON.stringify(content);
            const contentBytes = new TextEncoder().encode(contentJson);
            const ivContent = window.crypto.getRandomValues(new Uint8Array(12));
            const encryptedContentBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: ivContent },
                aesKey,
                contentBytes
            );

            const combinedContent = new Uint8Array(ivContent.length + encryptedContentBuffer.byteLength);
            combinedContent.set(ivContent);
            combinedContent.set(new Uint8Array(encryptedContentBuffer), ivContent.length);

            // 5. Encrypt title if provided
            let encryptedTitle: string | undefined;
            if (title !== undefined) {
                const titleBytes = new TextEncoder().encode(title);
                const ivTitle = window.crypto.getRandomValues(new Uint8Array(12));
                const encryptedTitleBuffer = await window.crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: ivTitle },
                    aesKey,
                    titleBytes
                );

                const combinedTitle = new Uint8Array(ivTitle.length + encryptedTitleBuffer.byteLength);
                combinedTitle.set(ivTitle);
                combinedTitle.set(new Uint8Array(encryptedTitleBuffer), ivTitle.length);
                encryptedTitle = btoa(String.fromCharCode(...combinedTitle));
            }

            return {
                encryptedContent: btoa(String.fromCharCode(...combinedContent)),
                encryptedTitle,
                encapsulatedKey: bytesToHex(encapsulatedKeyBytes),
                encryptedSymmetricKey,
            };
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus]);

    /**
     * Backward compatibility wrapper for encryptNote
     */
    const encryptNoteContent = useCallback(async (content: NoteContent): Promise<EncryptedNotePayload> => {
        return encryptNote(content);
    }, [encryptNote]);

    /**
     * Decrypt note content from backend response
     */
    const decryptNoteContent = useCallback(async (
        encryptedContent: string,
        encapsulatedKey: string,
        encryptedSymmetricKey: string
    ): Promise<NoteContent> => {
        try {
            setCryptoStatus('decrypting');

            const aesKey = await deriveAesKey(encapsulatedKey, encryptedSymmetricKey);

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
    }, [deriveAesKey, setCryptoStatus]);

    /**
     * Encrypt a string (e.g. title) using an existing AES key
     */
    const encryptString = useCallback(async (
        text: string,
        aesKey: CryptoKey
    ): Promise<string> => {
        const textBytes = new TextEncoder().encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            textBytes
        );

        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        return btoa(String.fromCharCode(...combined));
    }, []);

    /**
     * Decrypt a string (e.g. title) using an existing AES key
     */
    const decryptString = useCallback(async (
        encryptedText: string,
        aesKey: CryptoKey
    ): Promise<string> => {
        const binaryString = atob(encryptedText);
        const combined = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            combined[i] = binaryString.charCodeAt(i);
        }

        const iv = combined.slice(0, 12);
        const cipherData = combined.slice(12);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            cipherData
        );

        return new TextDecoder().decode(decryptedBuffer);
    }, []);

    /**
     * Generate a record hash for integrity verification
     */
    const generateNoteHash = useCallback(async (
        content: NoteContent,
        tags: string[] = [],
        title?: string
    ): Promise<string> => {
        const hashContent = `${JSON.stringify(content)}|${tags.sort().join(',')}|${title || ''}`;
        const msgUint8 = new TextEncoder().encode(hashContent);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }, []);

    return {
        encryptNoteContent,
        encryptNote,
        decryptNoteContent,
        deriveAesKey,
        encryptString,
        decryptString,
        generateNoteHash,
    };
};

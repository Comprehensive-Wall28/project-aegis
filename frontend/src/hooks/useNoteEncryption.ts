import { useCallback, useRef, useMemo } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { hexToBytes } from '../lib/cryptoUtils';
// Module exists but types are missing in environment
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

export interface NoteContent {
    type: 'doc';
    content: Array<Record<string, unknown>>;
}

export interface EncryptedNotePayload {
    encryptedContent: string;
    encryptedTitle?: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
}

export interface DecryptedNoteData {
    content: NoteContent;
}

export const useNoteEncryption = () => {
    const { user, setCryptoStatus } = useSessionStore();
    const workerRef = useRef<Worker | null>(null);

    const getWorker = useCallback(() => {
        if (!workerRef.current) {
            workerRef.current = new Worker(new URL('../workers/crypto.worker.ts', import.meta.url), { type: 'module' });
        }
        return workerRef.current;
    }, []);

    const deriveAesKey = useCallback(async (
        encapsulatedKey: string,
        encryptedSymmetricKey: string
    ): Promise<CryptoKey> => {
        if (!user || !user.privateKey) {
            throw new Error('User private key not found');
        }

        const privKeyBytes = hexToBytes(user.privateKey);
        const encapsulatedKeyBytes = hexToBytes(encapsulatedKey);
        const sharedSecret = ml_kem768.decapsulate(encapsulatedKeyBytes, privKeyBytes);

        const ivKeyHex = encryptedSymmetricKey.slice(0, 24);
        const cipherKeyHex = encryptedSymmetricKey.slice(24);
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

    const encryptNote = useCallback(async (content: NoteContent, title?: string): Promise<EncryptedNotePayload> => {
        if (!user || !user.publicKey) {
            throw new Error('User public key not found');
        }

        try {
            setCryptoStatus('encrypting');
            const worker = getWorker();
            return new Promise<EncryptedNotePayload>((resolve, reject) => {
                const handleMessage = (e: MessageEvent) => {
                    const { type, payload } = e.data;
                    if (type === 'ENCRYPT_SUCCESS') {
                        worker.removeEventListener('message', handleMessage);
                        resolve(payload);
                    } else if (type === 'ERROR') {
                        worker.removeEventListener('message', handleMessage);
                        reject(new Error(payload.message));
                    }
                };
                worker.addEventListener('message', handleMessage);
                worker.postMessage({
                    type: 'ENCRYPT_NOTE',
                    payload: { content, title, publicKey: user.publicKey! }
                });
            });
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus, getWorker]);

    const decryptNoteContent = useCallback(async (
        encryptedContent: string,
        encapsulatedKey: string,
        encryptedSymmetricKey: string
    ): Promise<NoteContent> => {
        if (!user || !user.privateKey) {
            throw new Error('User private key not found');
        }

        try {
            setCryptoStatus('decrypting');
            const worker = getWorker();
            return new Promise<NoteContent>((resolve, reject) => {
                const handleMessage = (e: MessageEvent) => {
                    const { type, payload } = e.data;
                    if (type === 'DECRYPT_SUCCESS') {
                        worker.removeEventListener('message', handleMessage);
                        resolve(payload.content);
                    } else if (type === 'ERROR') {
                        worker.removeEventListener('message', handleMessage);
                        reject(new Error(payload.message));
                    }
                };
                worker.addEventListener('message', handleMessage);
                worker.postMessage({
                    type: 'DECRYPT_NOTE',
                    payload: { encryptedContent, encapsulatedKey, encryptedSymmetricKey, privateKey: user.privateKey! }
                });
            });
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus, getWorker]);

    const encryptString = useCallback(async (text: string, aesKey: CryptoKey): Promise<string> => {
        const textBytes = new TextEncoder().encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, textBytes);
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);
        return btoa(String.fromCharCode(...combined));
    }, []);

    const decryptString = useCallback(async (encryptedText: string, aesKey: CryptoKey): Promise<string> => {
        const binaryString = atob(encryptedText);
        const combined = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) combined[i] = binaryString.charCodeAt(i);
        const iv = combined.slice(0, 12);
        const cipherData = combined.slice(12);
        const decryptedBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipherData);
        return new TextDecoder().decode(decryptedBuffer);
    }, []);

    const generateNoteHash = useCallback(async (content: NoteContent, tags: string[] = [], title?: string): Promise<string> => {
        const worker = getWorker();
        return new Promise<string>((resolve, reject) => {
            const handleMessage = (e: MessageEvent) => {
                const { type, payload } = e.data;
                if (type === 'HASH_SUCCESS') {
                    worker.removeEventListener('message', handleMessage);
                    resolve(payload.hash);
                } else if (type === 'ERROR') {
                    worker.removeEventListener('message', handleMessage);
                    reject(new Error(payload.message));
                }
            };
            worker.addEventListener('message', handleMessage);
            worker.postMessage({ type: 'GENERATE_HASH', payload: { content, tags, title } });
        });
    }, [getWorker]);

    const encryptNoteContent = useCallback((content: NoteContent) => encryptNote(content), [encryptNote]);

    return useMemo(() => ({
        encryptNoteContent,
        encryptNote,
        decryptNoteContent,
        deriveAesKey,
        encryptString,
        decryptString,
        generateNoteHash,
    }), [
        encryptNoteContent,
        encryptNote,
        decryptNoteContent,
        deriveAesKey,
        encryptString,
        decryptString,
        generateNoteHash
    ]);
};

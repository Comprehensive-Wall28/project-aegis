import { useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
// Module exists but types are missing in environment
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

export interface CalendarEventData {
    title: string;
    description: string;
    location: string;
}

export interface EncryptedCalendarPayload {
    encryptedData: string;      // IV:ciphertext (hex)
    encapsulatedKey: string;    // ML-KEM-768 cipher text (hex)
    encryptedSymmetricKey: string; // Wrapped AES key (IV + encrypted key, hex)
}

export interface EncryptedCalendarEvent extends EncryptedCalendarPayload {
    _id: string;
    userId: string;
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    color: string;
    recordHash: string;
    createdAt: string;
    updatedAt: string;
}

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

export const useCalendarEncryption = () => {
    const { user, setCryptoStatus } = useSessionStore();

    const generateAESKey = useCallback(async (): Promise<CryptoKey> => {
        return window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }, []);

    const encryptAESKey = useCallback(async (aesKey: CryptoKey, sharedSecret: Uint8Array): Promise<string> => {
        const wrappingKey = await window.crypto.subtle.importKey(
            'raw',
            sharedSecret.buffer.slice(sharedSecret.byteOffset, sharedSecret.byteOffset + sharedSecret.byteLength) as ArrayBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);

        const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            wrappingKey,
            rawKey
        );

        const result = new Uint8Array(iv.length + encryptedKeyBuffer.byteLength);
        result.set(iv);
        result.set(new Uint8Array(encryptedKeyBuffer), iv.length);

        return bytesToHex(result);
    }, []);

    const decryptAESKey = useCallback(async (encryptedSymmetricKey: string, sharedSecret: Uint8Array): Promise<CryptoKey> => {
        const encryptedKeyBytes = hexToBytes(encryptedSymmetricKey);
        const iv = encryptedKeyBytes.slice(0, 12);
        const encryptedKey = encryptedKeyBytes.slice(12);

        const unwrappingKey = await window.crypto.subtle.importKey(
            'raw',
            sharedSecret.buffer.slice(sharedSecret.byteOffset, sharedSecret.byteOffset + sharedSecret.byteLength) as ArrayBuffer,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const rawKey = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
            unwrappingKey,
            encryptedKey
        );

        return window.crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );
    }, []);

    const encryptEventData = useCallback(async (data: CalendarEventData): Promise<EncryptedCalendarPayload> => {
        if (!user || !user.publicKey) {
            throw new Error('User public key not found. PQC Engine must be operational.');
        }

        try {
            setCryptoStatus('encrypting');
            const aesKey = await generateAESKey();
            const pubKeyBytes = hexToBytes(user.publicKey);
            const { cipherText: encapsulatedKey, sharedSecret } = ml_kem768.encapsulate(pubKeyBytes);
            const encryptedSymmetricKey = await encryptAESKey(aesKey, sharedSecret);

            const dataJson = JSON.stringify(data);
            const dataBytes = new TextEncoder().encode(dataJson);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                dataBytes
            );

            const encryptedData = bytesToHex(iv) + ':' + bytesToHex(new Uint8Array(encryptedBuffer));

            return {
                encryptedData,
                encapsulatedKey: bytesToHex(encapsulatedKey),
                encryptedSymmetricKey,
            };
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, generateAESKey, encryptAESKey, setCryptoStatus]);

    const decryptEventData = useCallback(async (encryptedEvent: EncryptedCalendarEvent): Promise<CalendarEventData & { _id: string; startDate: string; endDate: string; isAllDay: boolean; color: string; createdAt: string; updatedAt: string }> => {
        if (!user || !user.privateKey) {
            throw new Error('User private key not found. PQC Engine must be operational.');
        }

        const privKeyBytes = hexToBytes(user.privateKey);
        const encapsulatedKeyBytes = hexToBytes(encryptedEvent.encapsulatedKey);
        const sharedSecret = ml_kem768.decapsulate(encapsulatedKeyBytes, privKeyBytes);

        const aesKey = await decryptAESKey(encryptedEvent.encryptedSymmetricKey, sharedSecret);

        const [ivHex, ciphertextHex] = encryptedEvent.encryptedData.split(':');
        const iv = hexToBytes(ivHex);
        const ciphertext = hexToBytes(ciphertextHex);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
            aesKey,
            ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer
        );

        const dataJson = new TextDecoder().decode(decryptedBuffer);
        const eventData: CalendarEventData = JSON.parse(dataJson);

        return {
            ...eventData,
            _id: encryptedEvent._id,
            startDate: encryptedEvent.startDate,
            endDate: encryptedEvent.endDate,
            isAllDay: encryptedEvent.isAllDay,
            color: encryptedEvent.color,
            createdAt: encryptedEvent.createdAt,
            updatedAt: encryptedEvent.updatedAt,
        };
    }, [user, decryptAESKey]);

    const decryptEvents = useCallback(async (encryptedEvents: EncryptedCalendarEvent[]) => {
        try {
            setCryptoStatus('decrypting');
            const results = await Promise.allSettled(
                encryptedEvents.map(event => decryptEventData(event))
            );

            return results
                .filter((r): r is PromiseFulfilledResult<CalendarEventData & { _id: string; startDate: string; endDate: string; isAllDay: boolean; color: string; createdAt: string; updatedAt: string }> => r.status === 'fulfilled')
                .map(r => r.value);
        } finally {
            setCryptoStatus('idle');
        }
    }, [decryptEventData, setCryptoStatus]);

    const generateRecordHash = useCallback(async (data: CalendarEventData, startDate: string, endDate: string): Promise<string> => {
        const content = `${data.title}|${data.description}|${data.location}|${startDate}|${endDate}`;
        const msgUint8 = new TextEncoder().encode(content);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }, []);

    return {
        encryptEventData,
        decryptEventData,
        decryptEvents,
        generateRecordHash,
    };
};

import { useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { pqcWorkerManager } from '../lib/pqcWorkerManager';

export interface CourseData {
    name: string;
    grade: number;
    credits: number;
    semester: string;
}

export interface EncryptedCoursePayload {
    encryptedData: string;      // IV:ciphertext (hex)
    encapsulatedKey: string;    // ML-KEM-768 cipher text (hex)
    encryptedSymmetricKey: string; // Wrapped AES key (IV + encrypted key, hex)
}

export interface EncryptedCourse extends EncryptedCoursePayload {
    _id: string;
    userId: string;
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

export const useCourseEncryption = () => {
    const { user, setCryptoStatus } = useSessionStore();

    /**
     * Generate a new AES-256-GCM key for encrypting course data.
     */
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

    /**
     * Encrypt an AES key using the shared secret from ML-KEM encapsulation.
     */
    const encryptAESKey = async (aesKey: CryptoKey, sharedSecret: Uint8Array): Promise<string> => {
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

        // Format: IV (12 bytes) + EncryptedKey
        const result = new Uint8Array(iv.length + encryptedKeyBuffer.byteLength);
        result.set(iv);
        result.set(new Uint8Array(encryptedKeyBuffer), iv.length);

        return bytesToHex(result);
    };

    /**
     * Decrypt an AES key using the shared secret.
     */
    const decryptAESKey = async (encryptedSymmetricKey: string, sharedSecret: Uint8Array): Promise<CryptoKey> => {
        const encryptedKeyBytes = hexToBytes(encryptedSymmetricKey);

        // First 12 bytes are IV, rest is encrypted key + auth tag
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
    };

    /**
     * Encrypt course data and return the encrypted payload.
     */
    const encryptCourseData = useCallback(async (course: CourseData): Promise<EncryptedCoursePayload> => {
        if (!user || !user.publicKey) {
            throw new Error('User public key not found. PQC Engine must be operational.');
        }

        try {
            setCryptoStatus('encrypting');
            // 1. Generate AES-256 Key
            const aesKey = await generateAESKey();

            // 2. Encapsulate Key (PQC ML-KEM-768) - now in worker
            const { cipherText: encapsulatedKey, sharedSecret } = await pqcWorkerManager.encapsulate(user.publicKey);

            // 3. Wrap AES Key with shared secret
            const encryptedSymmetricKey = await encryptAESKey(aesKey, sharedSecret);

            // 4. Encrypt course data as JSON
            const courseJson = JSON.stringify(course);
            const courseBytes = new TextEncoder().encode(courseJson);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                courseBytes
            );

            // Format: IV:Ciphertext (both hex)
            const encryptedData = bytesToHex(iv) + ':' + bytesToHex(new Uint8Array(encryptedBuffer));

            return {
                encryptedData,
                encapsulatedKey: bytesToHex(encapsulatedKey),
                encryptedSymmetricKey,
            };
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus, generateAESKey, encryptAESKey]);

    /**
     * Decrypt an encrypted course and return the plaintext course data.
     */
    const decryptCourseData = useCallback(async (encryptedCourse: EncryptedCourse): Promise<CourseData & { _id: string; createdAt: string; updatedAt: string }> => {
        if (!user || !user.privateKey) {
            throw new Error('User private key not found. PQC Engine must be operational.');
        }

        // 1. Decapsulate to get shared secret - now in worker
        const sharedSecret = await pqcWorkerManager.decapsulate(
            encryptedCourse.encapsulatedKey,
            user.privateKey
        );

        // 2. Decrypt AES key
        const aesKey = await decryptAESKey(encryptedCourse.encryptedSymmetricKey, sharedSecret);

        // 3. Decrypt course data
        const [ivHex, ciphertextHex] = encryptedCourse.encryptedData.split(':');
        const iv = hexToBytes(ivHex);
        const ciphertext = hexToBytes(ciphertextHex);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
            aesKey,
            ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer
        );

        const courseJson = new TextDecoder().decode(decryptedBuffer);
        const courseData: CourseData = JSON.parse(courseJson);

        return {
            ...courseData,
            _id: encryptedCourse._id,
            createdAt: encryptedCourse.createdAt,
            updatedAt: encryptedCourse.updatedAt,
        };
    }, [user, decryptAESKey]);

    /**
     * Decrypt multiple courses in parallel using worker batch processing.
     */
    const decryptCourses = useCallback(async (encryptedCourses: EncryptedCourse[]): Promise<(CourseData & { _id: string })[]> => {
        if (!user || !user.privateKey) {
            throw new Error('User private key not found. PQC Engine must be operational.');
        }

        try {
            setCryptoStatus('decrypting');
            // Use the batch worker decryption for maximum performance
            const decryptedResults = await pqcWorkerManager.batchDecryptCourses(
                encryptedCourses,
                user.privateKey
            );

            if (decryptedResults.length < encryptedCourses.length) {
                console.warn(`${encryptedCourses.length - encryptedCourses.length} courses failed to decrypt.`);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return decryptedResults as any;
        } finally {
            setCryptoStatus('idle');
        }
    }, [user, setCryptoStatus]);

    return {
        encryptCourseData,
        decryptCourseData,
        decryptCourses,
    };
};

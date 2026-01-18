import { pqcWorkerManager } from '@/lib/pqcWorkerManager';

// Helper: Convert hex string to Uint8Array
export const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

// Helper: Convert Uint8Array to hex string
export const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

// Generate random AES-256 key for room encryption
export const generateRoomKey = async (): Promise<CryptoKey> => {
    return window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable for sharing
        ['encrypt', 'decrypt']
    );
};

// Encrypt data with AES-GCM key
export const encryptWithAES = async (key: CryptoKey, data: string): Promise<string> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
    );

    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
};

// Decrypt data with AES-GCM key
export const decryptWithAES = async (key: CryptoKey, encryptedData: string): Promise<string> => {
    try {
        const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        return '[Encrypted]';
    }
};

// Encrypt room key with user's PQC public key (ML-KEM encapsulation)
export const encryptRoomKeyWithPQC = async (
    roomKey: CryptoKey,
    publicKeyHex: string
): Promise<string> => {
    const rawKey = await window.crypto.subtle.exportKey('raw', roomKey);
    const rawKeyBytes = new Uint8Array(rawKey);

    // Use Worker to encapsulate (heavy op)
    const { cipherText, sharedSecret } = await pqcWorkerManager.encryptRoomKey(publicKeyHex);

    // XOR the room key with the shared secret (first 32 bytes)
    const encryptedKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        encryptedKey[i] = rawKeyBytes[i] ^ sharedSecret[i];
    }

    // Combine ciphertext + encrypted key
    const combined = new Uint8Array(cipherText.length + encryptedKey.length);
    combined.set(cipherText);
    combined.set(encryptedKey, cipherText.length);

    return bytesToHex(combined);
};

// Decrypt room key with user's PQC private key (ML-KEM decapsulation)
export const decryptRoomKeyWithPQC = async (
    encryptedRoomKey: string,
    privateKeyHex: string
): Promise<CryptoKey> => {
    const combined = hexToBytes(encryptedRoomKey);

    // ML-KEM-768 ciphertext is 1088 bytes
    const cipherTextBytes = combined.slice(0, 1088);
    const encryptedKey = combined.slice(1088);

    // Convert ciphertext to hex for the worker
    const cipherTextHex = bytesToHex(cipherTextBytes);

    // Use Worker to decapsulate (heavy op)
    const sharedSecret = await pqcWorkerManager.decryptRoomKey(cipherTextHex, privateKeyHex);

    // XOR to recover room key
    const rawKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        rawKey[i] = encryptedKey[i] ^ sharedSecret[i];
    }

    // Import as CryptoKey
    return window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

// Export room key as base64 for URL fragment
export const exportRoomKeyToBase64 = async (key: CryptoKey): Promise<string> => {
    const rawKey = await window.crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(rawKey)));
};

// Import room key from base64 URL fragment
export const importRoomKeyFromBase64 = async (base64Key: string): Promise<CryptoKey> => {
    const rawKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
    return window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

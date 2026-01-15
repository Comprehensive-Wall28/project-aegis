/**
 * Crypto Utils - Deterministic PQC key derivation
 */

// @ts-ignore - Module likely exists but types are missing in environment
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

/**
 * Derive a 64-byte seed from a password for deterministic PQC key generation.
 * ML-KEM-768 keygen requires 64 bytes of entropy.
 */
export async function derivePQCSeed(password: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "aegis-pqc-salt-v1");
    // Use SHA-512 to get exactly 64 bytes
    const hashBuffer = await window.crypto.subtle.digest('SHA-512', data);
    return new Uint8Array(hashBuffer);
}

/**
 * Helper to convert Uint8Array to Hex
 */
export const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Helper to convert Hex to Uint8Array
 */
export const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};


/**
 * Generate PQC public key from password (for registration)
 */
export async function getPQCDiscoveryKey(password: string): Promise<string> {
    const seed = await derivePQCSeed(password);
    const { publicKey } = ml_kem768.keygen(seed);
    return bytesToHex(publicKey);
}

const SEED_STORAGE_KEY = 'aegis_pqc_seed';

/**
 * Store seed in localStorage (survives browser restart)
 */
export function storeSeed(seed: Uint8Array): void {
    const hex = bytesToHex(seed);
    localStorage.setItem(SEED_STORAGE_KEY, hex);
}

/**
 * Retrieve seed from localStorage
 */
export function getStoredSeed(): Uint8Array | null {
    const hex = localStorage.getItem(SEED_STORAGE_KEY);
    if (!hex) return null;

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Clear seed from localStorage
 */
export function clearStoredSeed(): void {
    localStorage.removeItem(SEED_STORAGE_KEY);
}

/**
 * Derive a high-performance AES-GCM vault key from the 64-byte PQC seed.
 * Uses the first 32 bytes of the seed as key material for AES-256-GCM.
 * This is deterministic based on the user's password-derived seed.
 */
export async function deriveVaultKey(seed: Uint8Array): Promise<CryptoKey> {
    if (seed.length < 32) {
        throw new Error('Seed must be at least 32 bytes for AES-256 key derivation');
    }

    // Use first 32 bytes (256 bits) for AES-256-GCM
    const keyMaterial = seed.slice(0, 32);

    return window.crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false, // Not extractable for security
        ['encrypt', 'decrypt']
    );
}

/**
 * Derive an AES-CTR key for low-overhead "Eco-Mode" encryption.
 * Uses the first 32 bytes of the seed as key material for AES-256-CTR.
 * This is deterministic based on the user's password-derived seed.
 */
export async function deriveGlobalCtrKey(seed: Uint8Array): Promise<CryptoKey> {
    if (seed.length < 32) {
        throw new Error('Seed must be at least 32 bytes for AES-256 key derivation');
    }

    // Use first 32 bytes (256 bits) for AES-256-CTR
    const keyMaterial = seed.slice(0, 32);

    return window.crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-CTR', length: 256 },
        false, // Not extractable for security
        ['encrypt', 'decrypt']
    );
}

export async function generateDEK(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        { name: 'AES-CTR', length: 256 },
        true, // Must be extractable to wrap it
        ['encrypt', 'decrypt']
    );
}

/**
 * Generate a unique random 256-bit AES-GCM key (Folder Key / Key Encryption Key).
 */
export async function generateFolderKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // Must be extractable
        ['encrypt', 'decrypt']
    );
}


/**
 * Wrap a Data Encryption Key (DEK) using a Master Key (AES-GCM).
 * Returns IV (12 bytes) + Encrypted Key as Hex.
 */
export async function wrapKey(keyToWrap: CryptoKey, masterKey: CryptoKey): Promise<string> {
    const rawKey = await window.crypto.subtle.exportKey('raw', keyToWrap);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        masterKey,
        rawKey
    );

    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);

    return bytesToHex(result);
}

/**
 * Unwrap a key using a Master Key (AES-GCM).
 * Default algorithm is AES-CTR (for DEKs).
 */
export async function unwrapKey(wrappedKeyHex: string, masterKey: CryptoKey, algo: 'AES-CTR' | 'AES-GCM' = 'AES-CTR'): Promise<CryptoKey> {

    const wrappedBytes = new Uint8Array(wrappedKeyHex.length / 2);
    for (let i = 0; i < wrappedKeyHex.length; i += 2) {
        wrappedBytes[i / 2] = parseInt(wrappedKeyHex.substring(i, i + 2), 16);
    }

    const iv = wrappedBytes.slice(0, 12);
    const encryptedKey = wrappedBytes.slice(12);

    const rawKey = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        masterKey,
        encryptedKey
    );

    return window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: algo, length: 256 },
        true, // Extractable if we need to re-wrap later
        ['encrypt', 'decrypt']
    );
}


/**
 * PQC Key Exchange: Encapsulate a Folder Key for a recipient.
 * Uses ML-KEM-768 to generate a shared secret, then encrypts the Folder Key with it.
 * Returns Hex of [KEM Ciphertext (1088 bytes)] + [IV (12 bytes)] + [Encrypted Folder Key].
 */
export async function encapsulateFolderKey(recipientPublicKeyHex: string, folderKey: CryptoKey): Promise<string> {
    const pk = hexToBytes(recipientPublicKeyHex);
    // @ts-ignore
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(pk);

    // Import sharedSecret as an AES-GCM key
    const ssKey = await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(sharedSecret),
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    // Export the folder key to encrypt it
    const rawFolderKey = await window.crypto.subtle.exportKey('raw', folderKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedFolderKey = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        ssKey,
        rawFolderKey
    );

    const result = new Uint8Array(cipherText.length + iv.length + encryptedFolderKey.byteLength);
    result.set(cipherText);
    result.set(iv, cipherText.length);
    result.set(new Uint8Array(encryptedFolderKey), cipherText.length + iv.length);

    return bytesToHex(result);
}

/**
 * PQC Key Exchange: Decapsulate a shared Folder Key.
 * @param wrappedBundleHex - Hex of [KEM Ciphertext] + [IV] + [Encrypted Folder Key]
 * @param privateKeyHex - Recipient's PQC Private Key
 */
export async function decapsulateFolderKey(wrappedBundleHex: string, privateKeyHex: string): Promise<CryptoKey> {
    const bundle = hexToBytes(wrappedBundleHex);
    const sk = hexToBytes(privateKeyHex);

    // ML-KEM-768 Ciphertext is 1088 bytes
    const KEM_CT_LEN = 1088;
    const ciphertext = bundle.slice(0, KEM_CT_LEN);
    const iv = bundle.slice(KEM_CT_LEN, KEM_CT_LEN + 12);
    const encryptedKey = bundle.slice(KEM_CT_LEN + 12);

    // @ts-ignore
    const sharedSecret = ml_kem768.decapsulate(ciphertext, sk);

    const ssKey = await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(sharedSecret),
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    const rawFolderKey = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        ssKey,
        encryptedKey
    );

    return window.crypto.subtle.importKey(
        'raw',
        rawFolderKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}




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
 * Generate PQC public key from password (for registration)
 */
export async function getPQCDiscoveryKey(password: string): Promise<string> {
    const seed = await derivePQCSeed(password);
    const { publicKey } = ml_kem768.keygen(seed);
    return bytesToHex(publicKey);
}

const SEED_STORAGE_KEY = 'aegis_pqc_seed';

/**
 * Store seed in sessionStorage (survives refresh, not tab close)
 */
export function storeSeed(seed: Uint8Array): void {
    const hex = bytesToHex(seed);
    sessionStorage.setItem(SEED_STORAGE_KEY, hex);
}

/**
 * Retrieve seed from sessionStorage
 */
export function getStoredSeed(): Uint8Array | null {
    const hex = sessionStorage.getItem(SEED_STORAGE_KEY);
    if (!hex) return null;

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Clear seed from sessionStorage
 */
export function clearStoredSeed(): void {
    sessionStorage.removeItem(SEED_STORAGE_KEY);
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

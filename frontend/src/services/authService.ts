import apiClient from './api';
import { pqcWorkerManager } from '../lib/pqcWorkerManager';
import type { UserPreferences } from '../stores/sessionStore';





export interface LoginCredentials {
    email: string;
    argon2Hash: string;
    legacyHash?: string;
}

export interface RegisterCredentials {
    username: string;
    email: string;
    pqcPublicKey: string;
    argon2Hash: string;
    legacyHash?: string;
}

export interface AuthResponse {
    _id: string;
    email: string;
    username: string;
    message: string;
    token?: string;
    pqcSeed?: Uint8Array;
    pqcPublicKey?: string;
}

// Migration helper: SHA-256 for legacy support
async function hashLegacy(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const authService = {
    login: async (email: string, passwordRaw: string): Promise<AuthResponse> => {
        // 0. Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Client-side hashing: Argon2 (new) + SHA-256 (legacy)
        const argon2HashPromise = pqcWorkerManager.getArgon2Hash(passwordRaw, `${normalizedEmail}aegis-auth-salt`);
        const legacyHashPromise = hashLegacy(passwordRaw);

        // 2. Optimization: Start PQC V2 discovery key derivation in parallel
        const v2PublicKeyPromise = pqcWorkerManager.getPQCDiscoveryKey(passwordRaw, normalizedEmail);

        // Wait for hashes and PQC key
        const [argon2Hash, legacyHash, v2PublicKey] = await Promise.all([
            argon2HashPromise,
            legacyHashPromise,
            v2PublicKeyPromise
        ]);

        // 3. Call backend login
        const response = await apiClient.post<AuthResponse>('/auth/login', {
            email: normalizedEmail,
            argon2Hash: argon2Hash.toLowerCase(),
            legacyHash: legacyHash.toLowerCase()
        });
        const userData = response.data;

        // 4. Dual-salt fallback logic for PQC seed
        let pqcSeed: Uint8Array;
        if (userData && v2PublicKey === userData.pqcPublicKey) {
            // New account (V2)
            pqcSeed = await pqcWorkerManager.derivePQCSeed(passwordRaw, normalizedEmail);
            console.log("PQC Seed derived using V2 (email) salt (Worker)");
        } else {
            // Existing account or password mismatch (V1)
            pqcSeed = await pqcWorkerManager.derivePQCSeed(passwordRaw);
            console.log("PQC Seed derived using legacy V1 (static) salt (Worker)");
        }

        return {
            ...userData,
            pqcSeed
        };
    },

    register: async (username: string, email: string, passwordRaw: string): Promise<AuthResponse> => {
        // 0. Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Client-side hashing: Argon2 (new) + SHA-256 (legacy)
        const argon2HashPromise = pqcWorkerManager.getArgon2Hash(passwordRaw, `${normalizedEmail}aegis-auth-salt`);
        const legacyHashPromise = hashLegacy(passwordRaw);

        // 2. Generate Deterministic PQC Keypair using V2 (email) salt (via Worker)
        const pqcDiscoveryKeyPromise = pqcWorkerManager.getPQCDiscoveryKey(passwordRaw, normalizedEmail);
        const pqcSeedPromise = pqcWorkerManager.derivePQCSeed(passwordRaw, normalizedEmail);

        // Wait for all cryptographic operations
        const [argon2Hash, legacyHash, pqcPublicKey, pqcSeed] = await Promise.all([
            argon2HashPromise,
            legacyHashPromise,
            pqcDiscoveryKeyPromise,
            pqcSeedPromise
        ]);

        // 3. Send to backend
        const response = await apiClient.post<AuthResponse>('/auth/register', {
            username,
            email: normalizedEmail,
            pqcPublicKey,
            argon2Hash: argon2Hash.toLowerCase(),
            legacyHash: legacyHash.toLowerCase(),
        });

        return {
            ...response.data,
            pqcSeed
        };
    },

    validateSession: async (): Promise<{ _id: string; email: string; username: string; preferences?: UserPreferences } | null> => {
        try {
            const response = await apiClient.get<{ _id: string; email: string; username: string; preferences?: UserPreferences }>('/auth/me');
            return response.data;
        } catch {
            return null;
        }
    },

    logout: async (): Promise<void> => {
        try {
            await apiClient.post('/auth/logout');
        } catch {
            // Ignore errors on logout
        } finally {
            // No cleanup needed for http-only cookie
        }
    },

    updateProfile: async (data: {
        username?: string;
        email?: string;
        preferences?: Partial<UserPreferences>
    }): Promise<{ _id: string; email: string; username: string; preferences?: UserPreferences }> => {
        const response = await apiClient.put<{ _id: string; email: string; username: string; preferences?: UserPreferences }>('/auth/me', data);
        return response.data;
    },

};

export default authService;

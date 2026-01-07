import axios from 'axios';

import { derivePQCSeed, getPQCDiscoveryKey } from '../lib/cryptoUtils';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// Remove trailing slash if present and append auth path
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api/auth`;

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});



export interface LoginCredentials {
    email: string;
    argon2Hash: string;
}

export interface RegisterCredentials {
    username: string;
    email: string;
    pqcPublicKey: string;
    argon2Hash: string;
}

export interface AuthResponse {
    _id: string;
    email: string;
    username: string;
    message: string;
    token?: string; // Token returned for cross-origin localStorage auth
    pqcSeed?: Uint8Array; // Derived locally
}

// Web Crypto API helper to simulate Argon2 client-side hashing (using SHA-256 for demo)
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

const authService = {
    login: async (email: string, passwordRaw: string): Promise<AuthResponse> => {
        // 1. Client-side hashing (simulated with SHA-256)
        const argon2Hash = await hashPassword(passwordRaw);

        // 2. Derive PQC Seed for key persistence
        const pqcSeed = await derivePQCSeed(passwordRaw);

        // 3. Send to backend
        const response = await apiClient.post<AuthResponse>('/login', {
            email,
            argon2Hash,
        });



        return {
            ...response.data,
            pqcSeed
        };
    },

    register: async (username: string, email: string, passwordRaw: string): Promise<AuthResponse> => {
        // 1. Client-side hashing
        const argon2Hash = await hashPassword(passwordRaw);

        // 2. Generate Deterministic PQC Keypair
        const pqcPublicKey = await getPQCDiscoveryKey(passwordRaw);
        const pqcSeed = await derivePQCSeed(passwordRaw);

        // 3. Send to backend
        const response = await apiClient.post<AuthResponse>('/register', {
            username,
            email,
            pqcPublicKey,
            argon2Hash,
        });

        return {
            ...response.data,
            pqcSeed
        };
    },

    validateSession: async (): Promise<{ _id: string; email: string; username: string } | null> => {
        try {
            const response = await apiClient.get<{ _id: string; email: string; username: string }>('/me');
            return response.data;
        } catch {
            return null;
        }
    },

    logout: async (): Promise<void> => {
        try {
            await apiClient.post('/logout');
        } catch {
            // Ignore errors on logout
        } finally {
            // No cleanup needed for http-only cookie
        }
    },
};

export default authService;


import apiClient from './api';
import { derivePQCSeed, getPQCDiscoveryKey } from '../lib/cryptoUtils';
import type { UserPreferences } from '../stores/sessionStore';
import {
    startRegistration,
    startAuthentication,
} from '@simplewebauthn/browser';





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
    token?: string;
    pqcSeed?: Uint8Array;
    preferences?: UserPreferences;
    status?: string;
    options?: any;
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
        const response = await apiClient.post<any>('/auth/login', {
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
        const response = await apiClient.post<AuthResponse>('/auth/register', {
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

    registerPasskey: async (): Promise<boolean> => {
        try {
            // 1. Get options from backend
            const optionsResponse = await apiClient.post('/auth/webauthn/register-options');
            const options = optionsResponse.data;

            // 2. Start registration in browser
            const credential = await startRegistration({ optionsJSON: options });

            // 3. Verify with backend
            const verifyResponse = await apiClient.post('/auth/webauthn/register-verify', credential);
            return verifyResponse.data.verified;
        } catch (error) {
            console.error('Passkey registration failed:', error);
            throw error;
        }
    },

    loginWithPasskey: async (email: string, passwordRaw: string): Promise<AuthResponse> => {
        try {
            // 1. Get options from backend
            const optionsResponse = await apiClient.post('/auth/webauthn/login-options', { email });
            const options = optionsResponse.data;

            // 2. Start authentication in browser
            const credential = await startAuthentication({ optionsJSON: options });

            // 3. Verify with backend
            const verifyResponse = await apiClient.post<AuthResponse>('/auth/webauthn/login-verify', {
                email,
                body: credential
            });

            // 4. Derive PQC Seed (still needed for vault encryption)
            const pqcSeed = await derivePQCSeed(passwordRaw);

            return {
                ...verifyResponse.data,
                pqcSeed
            };
        } catch (error) {
            console.error('Passkey login failed:', error);
            throw error;
        }
    },
};

export default authService;

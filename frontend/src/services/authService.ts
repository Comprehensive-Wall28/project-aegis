import axios from 'axios';

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
    email: string;
    pqcPublicKey: string;
    argon2Hash: string;
}

export interface AuthResponse {
    _id: string;
    email: string;
    message: string;
}

// Web Crypto API helper to simulate Argon2 client-side hashing (using SHA-256 for demo)
// In a real PQC scenario, we might use a WASM implementation of Argon2 or a PQC signature.
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Mock PQC Key Generation (In reality, this would use a library like liboqs-ts)
function generateMockPQCKey(): string {
    return 'ml-kem-768-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const authService = {
    login: async (email: string, passwordRaw: string): Promise<AuthResponse> => {
        // 1. Client-side hashing (simulated with SHA-256)
        const argon2Hash = await hashPassword(passwordRaw);

        // 2. Send to backend
        const response = await apiClient.post<AuthResponse>('/login', {
            email,
            argon2Hash,
        });
        return response.data;
    },

    register: async (email: string, passwordRaw: string): Promise<AuthResponse> => {
        // 1. Client-side hashing
        const argon2Hash = await hashPassword(passwordRaw);

        // 2. Generate PQC Keypair (mock)
        const pqcPublicKey = generateMockPQCKey();

        // 3. Send to backend
        const response = await apiClient.post<AuthResponse>('/register', {
            email,
            pqcPublicKey,
            argon2Hash,
        });
        return response.data;
    },
};

export default authService;

import axios from 'axios';
import tokenService from './tokenService';

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

// Add Authorization header if token exists
apiClient.interceptors.request.use((config) => {
    const token = tokenService.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Clear token on 401 responses (auto-logout)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            tokenService.removeToken();
        }
        return Promise.reject(error);
    }
);

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

        // 3. Store token in localStorage if provided (cross-origin scenario)
        if (response.data.token) {
            tokenService.setToken(response.data.token);
        }

        return response.data;
    },

    register: async (username: string, email: string, passwordRaw: string): Promise<AuthResponse> => {
        // 1. Client-side hashing
        const argon2Hash = await hashPassword(passwordRaw);

        // 2. Generate PQC Keypair (mock)
        const pqcPublicKey = generateMockPQCKey();

        // 3. Send to backend
        const response = await apiClient.post<AuthResponse>('/register', {
            username,
            email,
            pqcPublicKey,
            argon2Hash,
        });
        return response.data;
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
            // Always clear localStorage token
            tokenService.removeToken();
        }
    },
};

export default authService;


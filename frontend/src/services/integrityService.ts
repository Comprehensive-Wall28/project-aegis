import axios from 'axios';
import tokenService from './tokenService';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api/integrity`;

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


export interface MerkleRootResponse {
    merkleRoot: string;
    lastUpdated: string;
}

export interface GPALog {
    _id: string;
    semester: string;
    gpa: number;
    recordHash: string;
    createdAt: string;
}

export interface GPAVerifyResponse {
    currentGPA: number;
    merkleRoot: string;
    logs: GPALog[];
}

const integrityService = {
    getMerkleRoot: async (): Promise<MerkleRootResponse> => {
        const response = await apiClient.get<MerkleRootResponse>('/merkle-root');
        return response.data;
    },

    getGPALogs: async (): Promise<GPALog[]> => {
        const response = await apiClient.get<GPALog[]>('/gpa-logs');
        return response.data;
    },

    verifyIntegrity: async (): Promise<GPAVerifyResponse> => {
        const response = await apiClient.get<GPAVerifyResponse>('/verify');
        return response.data;
    },

    // Client-side Merkle tree calculation for tampering detection
    calculateMerkleRoot: (hashes: string[]): string => {
        if (hashes.length === 0) return '';
        if (hashes.length === 1) return hashes[0];

        const newLevel: string[] = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = hashes[i + 1] || left;
            // Simple hash combination (in production, use proper crypto)
            newLevel.push(simpleHash(left + right));
        }
        return integrityService.calculateMerkleRoot(newLevel);
    },
};

// Simple hash function for demo (in production, use Web Crypto API)
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

export default integrityService;

import { create } from 'zustand';

interface User {
    _id: string;
    email: string;
    username: string;
    publicKey?: string; // Hex encoded ML-KEM-768 public key
    privateKey?: string; // Hex encoded ML-KEM-768 private key (stored only in memory, never sent to server)
}

interface SessionState {
    user: User | null;
    isAuthenticated: boolean;
    pqcEngineStatus: 'operational' | 'initializing' | 'error';
    // Ephemeral session keys - stored only in memory
    sessionKey: string | null;

    // Actions
    setUser: (user: User) => void;
    setSessionKey: (key: string) => void;
    clearSession: () => void;
    setPqcEngineStatus: (status: 'operational' | 'initializing' | 'error') => void;
    initializeQuantumKeys: () => void;
}

// @ts-ignore
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

export const useSessionStore = create<SessionState>((set) => ({
    user: null,
    isAuthenticated: false,
    pqcEngineStatus: 'initializing',
    sessionKey: null,

    setUser: (user) => set({
        user,
        isAuthenticated: true,
        pqcEngineStatus: 'operational'
    }),

    setSessionKey: (key) => set({ sessionKey: key }),

    clearSession: () => set({
        user: null,
        isAuthenticated: false,
        sessionKey: null,
        pqcEngineStatus: 'initializing'
    }),

    setPqcEngineStatus: (status) => set({ pqcEngineStatus: status }),

    initializeQuantumKeys: () => {
        try {
            // @ts-ignore
            const { publicKey, secretKey } = ml_kem768.keygen();

            // Helper to convert to Hex
            const bytesToHex = (bytes: Uint8Array) =>
                Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

            const pubHex = bytesToHex(publicKey);
            const privHex = bytesToHex(secretKey);

            set(state => {
                if (state.user) {
                    return {
                        user: {
                            ...state.user,
                            publicKey: pubHex,
                            privateKey: privHex // Store private key in memory for decryption
                        },
                        pqcEngineStatus: 'operational'
                    };
                }
                return {};
            });
            console.log("Quantum Keys Initialized for Session");
        } catch (e) {
            console.error("Failed to generate PQC keys", e);
            set({ pqcEngineStatus: 'error' });
        }
    }
}));


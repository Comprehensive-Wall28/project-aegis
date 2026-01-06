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

export const useSessionStore = create<SessionState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    pqcEngineStatus: 'initializing',
    sessionKey: null,

    setUser: (user) => {
        set({
            user,
            isAuthenticated: true,
        });

        // Auto-initialize keys if they are not already in the user object
        if (!user.publicKey || !user.privateKey) {
            get().initializeQuantumKeys();
        } else {
            set({ pqcEngineStatus: 'operational' });
        }
    },

    setSessionKey: (key) => set({ sessionKey: key }),

    clearSession: () => set({
        user: null,
        isAuthenticated: false,
        sessionKey: null,
        pqcEngineStatus: 'initializing'
    }),

    setPqcEngineStatus: (status) => set({ pqcEngineStatus: status }),

    initializeQuantumKeys: () => {
        // Set to initializing state
        set({ pqcEngineStatus: 'initializing' });

        // Run async initialization without blocking
        (async () => {
            try {
                // Dynamic import to handle WASM loading issues
                const { ml_kem768 } = await import('@noble/post-quantum/ml-kem.js');

                // Generate keys
                const { publicKey, secretKey } = ml_kem768.keygen();

                // Helper to convert to Hex
                const bytesToHex = (bytes: Uint8Array) =>
                    Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

                const pubHex = bytesToHex(publicKey);
                const privHex = bytesToHex(secretKey);

                const currentState = get();
                if (currentState.user) {
                    set({
                        user: {
                            ...currentState.user,
                            publicKey: pubHex,
                            privateKey: privHex
                        },
                        pqcEngineStatus: 'operational'
                    });
                    console.log("Quantum Keys Initialized for Session");
                } else {
                    // If no user, we still set it as operational for the engine itself
                    set({ pqcEngineStatus: 'operational' });
                }
            } catch (e) {
                console.error("Failed to generate PQC keys:", e);
                set({ pqcEngineStatus: 'error' });
            }
        })();
    }
}));

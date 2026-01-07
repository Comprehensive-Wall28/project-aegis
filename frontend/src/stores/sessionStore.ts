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
    isAuthChecking: boolean;
    pqcEngineStatus: 'operational' | 'initializing' | 'error';
    // Ephemeral session keys - stored only in memory
    sessionKey: string | null;

    // Actions
    setUser: (user: User) => void;
    setSessionKey: (key: string) => void;
    clearSession: () => void;
    setPqcEngineStatus: (status: 'operational' | 'initializing' | 'error') => void;
    initializeQuantumKeys: (seed?: Uint8Array) => void;
    checkAuth: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isAuthChecking: true,
    pqcEngineStatus: 'initializing',
    sessionKey: null,

    setUser: (user) => {
        set({
            user,
            isAuthenticated: true,
        });

        // If keys are provided, we're operational
        if (user.publicKey && user.privateKey) {
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

    initializeQuantumKeys: (seed) => {
        // Set to initializing state
        set({ pqcEngineStatus: 'initializing' });

        // Run async initialization without blocking
        (async () => {
            try {
                // Dynamic import to handle WASM loading issues
                const { ml_kem768 } = await import('@noble/post-quantum/ml-kem.js');

                // Generate keys - use seed if provided for persistence
                const { publicKey, secretKey } = seed ? ml_kem768.keygen(seed) : ml_kem768.keygen();

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
                    console.log(`Quantum Keys Initialized for Session ${seed ? '(Persistent)' : '(Ephemeral)'}`);
                } else {
                    // If no user, we still set it as operational for the engine itself
                    set({ pqcEngineStatus: 'operational' });
                }
            } catch (e) {
                console.error("Failed to generate PQC keys:", e);
                set({ pqcEngineStatus: 'error' });
            }
        })();
    },

    checkAuth: async () => {
        set({ isAuthChecking: true });
        try {
            // Dynamically import authService to avoid circular dependencies if any
            const { default: authService } = await import('../services/authService');
            const user = await authService.validateSession();

            if (user) {
                const currentState = get();
                // Recover keys from local storage if they exist
                const { getStoredSeed } = await import('../lib/cryptoUtils');
                const seed = getStoredSeed();

                set({
                    user,
                    isAuthenticated: true,
                    isAuthChecking: false
                });

                if (seed) {
                    currentState.initializeQuantumKeys(seed);
                }
            } else {
                set({
                    user: null,
                    isAuthenticated: false,
                    isAuthChecking: false
                });
            }
        } catch (error) {
            set({
                user: null,
                isAuthenticated: false,
                isAuthChecking: false
            });
        }
    }
}));

import { create } from 'zustand';
import auditService, { type AuditLog } from '@/services/auditService';
import authService from '@/services/authService';
import vaultService from '@/services/vaultService';
import * as cryptoUtils from '@/lib/cryptoUtils';
import { pqcWorkerManager } from '@/lib/pqcWorkerManager';

export interface UserPreferences {
    sessionTimeout: number; // minutes
    encryptionLevel: 'STANDARD' | 'HIGH' | 'PARANOID';
    backgroundImage?: string | null;
    backgroundBlur?: number;
    backgroundOpacity?: number;
}

interface User {
    _id: string;
    email: string;
    username: string;
    publicKey?: string; // Hex encoded ML-KEM-768 public key
    privateKey?: string; // Hex encoded ML-KEM-768 private key (stored only in memory, never sent to server)
    vaultKey?: CryptoKey | null; // AES-GCM vault key for file encryption (in-memory only)
    preferences?: UserPreferences;
    hasPassword?: boolean;
    totalStorageUsed?: number;
}

export type CryptoStatus = 'idle' | 'encrypting' | 'decrypting' | 'processing' | 'done';

interface SessionState {
    user: User | null;
    isAuthenticated: boolean;
    isAuthChecking: boolean;
    pqcEngineStatus: 'operational' | 'initializing' | 'error';
    cryptoStatus: CryptoStatus;
    cryptoOpsCount: number;
    // Ephemeral session keys - stored only in memory
    sessionKey: string | null;
    // AES-CTR key for Eco-Mode encryption (memory only)
    vaultCtrKey: CryptoKey | null;
    // Recent activity for dashboard widget
    recentActivity: AuditLog[];

    // Actions
    setUser: (user: User) => void;
    setSessionKey: (key: string) => void;
    clearSession: () => void;
    lockSession: () => void;
    setPqcEngineStatus: (status: 'operational' | 'initializing' | 'error') => void;
    setCryptoStatus: (status: CryptoStatus) => void;
    initializeQuantumKeys: (seed?: Uint8Array) => void;
    checkAuth: () => Promise<void>;
    updateUser: (updates: Partial<Pick<User, 'username' | 'email' | 'totalStorageUsed' | 'preferences'>>) => void;
    setRecentActivity: (logs: AuditLog[]) => void;
    fetchRecentActivity: () => Promise<void>;
    fetchStorageStats: () => Promise<void>;
}

// Module-level flag to prevent concurrent auth checks
let authCheckInProgress = false;

export const useSessionStore = create<SessionState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isAuthChecking: true,
    pqcEngineStatus: 'initializing',
    cryptoStatus: 'idle',
    cryptoOpsCount: 0,
    sessionKey: null,
    vaultCtrKey: null,
    recentActivity: [],

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
        vaultCtrKey: null,
        pqcEngineStatus: 'initializing',
        cryptoStatus: 'idle',
        cryptoOpsCount: 0,
        recentActivity: []
        // Note: vaultKey is on user object, so cleared when user is set to null
    }),

    lockSession: () => {
        cryptoUtils.clearStoredSeed();
        set({
            user: null,
            isAuthenticated: false,
            sessionKey: null,
            vaultCtrKey: null,
            pqcEngineStatus: 'initializing'
        });
    },

    setPqcEngineStatus: (status) => set({ pqcEngineStatus: status }),

    setCryptoStatus: (status) => {
        if (status === 'idle') {
            // Use a timeout to ensure the busy state is visible for at least 500ms
            setTimeout(() => {
                set(state => {
                    const newCount = Math.max(0, state.cryptoOpsCount - 1);

                    if (newCount === 0) {
                        // Start transition to "done"
                        setTimeout(() => {
                            set(state => {
                                // Only set to idle if no new operations started
                                if (state.cryptoStatus === 'done' && state.cryptoOpsCount === 0) {
                                    return { cryptoStatus: 'idle' };
                                }
                                return {};
                            });
                        }, 1500); // Show "Done!" for 1.5s

                        return {
                            cryptoOpsCount: 0,
                            cryptoStatus: 'done'
                        };
                    }

                    return { cryptoOpsCount: newCount };
                });
            }, 500);
        } else {
            set(state => ({
                cryptoOpsCount: state.cryptoOpsCount + 1,
                cryptoStatus: status
            }));
        }
    },

    initializeQuantumKeys: (seed) => {
        // Set to initializing state
        set({ pqcEngineStatus: 'initializing' });

        (async () => {
            try {
                // Use centralized PQC Worker Manager for heavy computation
                const { publicKey, secretKey } = await pqcWorkerManager.generateKeys(seed);

                // Helper to convert to Hex
                const bytesToHex = (bytes: Uint8Array) =>
                    Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

                const pubHex = bytesToHex(publicKey);
                const privHex = bytesToHex(secretKey);

                // Derive vault key for high-performance symmetric encryption
                let vaultKey: CryptoKey | null = null;
                if (seed) {
                    const { deriveVaultKey, deriveGlobalCtrKey } = cryptoUtils;
                    vaultKey = await deriveVaultKey(seed);

                    // Derive CTR key for Eco-Mode encryption
                    const ctrKey = await deriveGlobalCtrKey(seed);
                    set({ vaultCtrKey: ctrKey });
                }

                const currentState = get();
                if (currentState.user) {
                    set({
                        user: {
                            ...currentState.user,
                            publicKey: pubHex,
                            privateKey: privHex,
                            vaultKey
                        },
                        pqcEngineStatus: 'operational'
                    });
                    console.log(`Quantum Keys Initialized (Worker) for Session ${seed ? '(Persistent)' : '(Ephemeral)'}, Vault Key: ${vaultKey ? 'Yes' : 'No'}`);
                } else {
                    // If no user, we still set it as operational for the engine itself
                    set({ pqcEngineStatus: 'operational' });
                }
            } catch (e) {
                console.error("Failed to generate PQC keys (Worker):", e);
                set({ pqcEngineStatus: 'error' });
            }
        })();
    },

    updateUser: (updates) => {
        const currentState = get();
        if (currentState.user) {
            set({
                user: {
                    ...currentState.user,
                    ...updates
                }
            });
        }
    },

    checkAuth: async () => {
        // Skip if already successfully authenticated
        const currentState = get();
        if (currentState.isAuthenticated && currentState.user !== null) {
            return;
        }

        // Skip if another check is in progress (prevents duplicate requests)
        if (authCheckInProgress) {
            return;
        }

        authCheckInProgress = true;
        set({ isAuthChecking: true });
        try {
            // First check if there's a stored seed - if not, don't bother checking auth
            // This prevents unnecessary 401 requests on the homepage for non-logged-in users
            const { getStoredSeed } = cryptoUtils;
            const seed = getStoredSeed();

            if (!seed) {
                // No seed means no active session worth restoring
                set({
                    user: null,
                    isAuthenticated: false,
                    isAuthChecking: false,
                    pqcEngineStatus: 'initializing'
                });
                return;
            }

            // Use static import
            // const { default: authService } = await import('../services/authService');
            const user = await authService.validateSession();

            if (user) {
                const currentState = get();

                set({
                    user,
                    isAuthenticated: true,
                    isAuthChecking: false
                });

                currentState.initializeQuantumKeys(seed);
            } else {
                // Server says not authenticated but we have a seed - clear it
                const { clearStoredSeed } = cryptoUtils;
                clearStoredSeed();
                set({
                    user: null,
                    isAuthenticated: false,
                    isAuthChecking: false,
                    pqcEngineStatus: 'initializing'
                });
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            set({
                user: null,
                isAuthenticated: false,
                isAuthChecking: false,
                pqcEngineStatus: 'error'
            });
        } finally {
            authCheckInProgress = false;
        }
    },

    setRecentActivity: (logs) => set({ recentActivity: logs }),

    fetchRecentActivity: async () => {
        const currentState = get();
        if (!currentState.isAuthenticated) return;

        try {
            const logs = await auditService.getRecentActivity();
            set({ recentActivity: logs });
        } catch (error) {
            console.error('Failed to fetch recent activity:', error);
        }
    },

    fetchStorageStats: async () => {
        const currentState = get();
        if (!currentState.isAuthenticated) return;

        try {
            const data = await vaultService.getStorageStats();
            get().updateUser({ totalStorageUsed: data.totalStorageUsed });
        } catch (error) {
            console.error('Failed to fetch storage stats:', error);
        }
    }
}));

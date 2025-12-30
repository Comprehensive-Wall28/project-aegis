import { create } from 'zustand';

interface User {
    _id: string;
    email: string;
    username: string;
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
}

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
}));

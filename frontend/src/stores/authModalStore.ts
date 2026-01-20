import { create } from 'zustand';

export type AuthMode = 'login' | 'register';

interface AuthModalState {
    isOpen: boolean;
    mode: AuthMode;
    openModal: (mode?: AuthMode) => void;
    closeModal: () => void;
    setMode: (mode: AuthMode) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    isOpen: false,
    mode: 'login',
    openModal: (mode = 'login') => set({ isOpen: true, mode }),
    closeModal: () => set({ isOpen: false }),
    setMode: (mode) => set({ mode }),
}));

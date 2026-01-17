import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GPASystem = 'NORMAL' | 'GERMAN';

interface GermanScaleConfig {
    nMax: number; // Best grade (default: 1.0)
    nMin: number; // Lowest passing grade (default: 4.0)
}

interface PreferenceState {
    gpaSystem: GPASystem;
    germanScaleConfig: GermanScaleConfig;
    isLoading: boolean;
    isSidebarCollapsed: boolean;
    backgroundImage: string | null;
    backgroundBlur: number;
    backgroundOpacity: number;

    // Actions
    setGPASystem: (system: GPASystem) => void;
    setGermanConfig: (config: Partial<GermanScaleConfig>) => void;
    setLoading: (loading: boolean) => void;
    toggleSidebar: () => void;
    setBackgroundImage: (fileId: string | null) => void;
    setBackgroundBlur: (blur: number) => void;
    setBackgroundOpacity: (opacity: number) => void;
    reset: () => void;
}

const defaultGermanConfig: GermanScaleConfig = {
    nMax: 1.0,
    nMin: 4.0,
};

export const usePreferenceStore = create<PreferenceState>()(
    persist(
        (set) => ({
            gpaSystem: 'NORMAL',
            germanScaleConfig: defaultGermanConfig,
            isLoading: false,
            isSidebarCollapsed: true,
            backgroundImage: null,
            backgroundBlur: 8,
            backgroundOpacity: 0.4,

            setGPASystem: (system) => set({ gpaSystem: system }),

            setGermanConfig: (config) =>
                set((state) => ({
                    germanScaleConfig: { ...state.germanScaleConfig, ...config },
                })),

            setLoading: (loading) => set({ isLoading: loading }),
            toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
            setBackgroundImage: (fileId) => set({ backgroundImage: fileId }),
            setBackgroundBlur: (blur) => set({ backgroundBlur: blur }),
            setBackgroundOpacity: (opacity) => set({ backgroundOpacity: opacity }),

            reset: () =>
                set({
                    gpaSystem: 'NORMAL',
                    germanScaleConfig: defaultGermanConfig,
                    isLoading: false,
                    isSidebarCollapsed: true,
                }),
        }),
        {
            name: 'aegis-preference-storage',
        }
    )
);

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

    // Actions
    setGPASystem: (system: GPASystem) => void;
    setGermanConfig: (config: Partial<GermanScaleConfig>) => void;
    setLoading: (loading: boolean) => void;
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

            setGPASystem: (system) => set({ gpaSystem: system }),

            setGermanConfig: (config) =>
                set((state) => ({
                    germanScaleConfig: { ...state.germanScaleConfig, ...config },
                })),

            setLoading: (loading) => set({ isLoading: loading }),

            reset: () =>
                set({
                    gpaSystem: 'NORMAL',
                    germanScaleConfig: defaultGermanConfig,
                    isLoading: false,
                }),
        }),
        {
            name: 'aegis-preference-storage',
        }
    )
);

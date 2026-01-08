import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'default' | 'purple' | 'catppuccin' | 'amoled' | 'light';

const THEME_ORDER: Theme[] = ['default', 'purple', 'catppuccin', 'amoled', 'light'];

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'default',
            setTheme: (theme) => {
                set({ theme });
                document.documentElement.setAttribute('data-theme', theme);
            },
            toggleTheme: () =>
                set((state) => {
                    const currentIndex = THEME_ORDER.indexOf(state.theme);
                    const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
                    const newTheme = THEME_ORDER[nextIndex];
                    document.documentElement.setAttribute('data-theme', newTheme);
                    return { theme: newTheme };
                }),
        }),
        {
            name: 'aegis-theme-storage',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    document.documentElement.setAttribute('data-theme', state.theme);
                }
            },
        }
    )
);

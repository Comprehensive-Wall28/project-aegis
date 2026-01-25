import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'default' | 'purple' | 'catppuccin-mocha' | 'catppuccin-macchiato' | 'catppuccin-frappe' | 'amoled' | 'grey' | 'ocean' | 'light' | 'tokyonight';

export const THEME_ORDER: Theme[] = ['default', 'purple', 'catppuccin-mocha', 'catppuccin-macchiato', 'catppuccin-frappe', 'amoled', 'grey', 'ocean', 'tokyonight', 'light'];

export const THEME_DISPLAY_NAMES: Record<Theme, string> = {
    default: 'Default',
    purple: 'Purple',
    'catppuccin-mocha': 'Catppuccin Mocha',
    'catppuccin-macchiato': 'Catppuccin Macchiato',
    'catppuccin-frappe': 'Catppuccin Frappé',
    amoled: 'AMOLED',
    grey: 'Grey',
    ocean: 'Ocean',
    tokyonight: 'Tokyo Night',
    light: 'Light',
};

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'ocean',
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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'default' | 'catppuccin' | 'amoled';

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
                    const newTheme =
                        state.theme === 'default'
                            ? 'catppuccin'
                            : state.theme === 'catppuccin'
                                ? 'amoled'
                                : 'default';
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

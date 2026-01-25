import type { Theme } from '@/stores/themeStore';

export const THEME_PALETTES: Record<Theme, { background: string; paper: string; primary: string; text: string }> = {
    default: {
        background: '#020617',
        paper: '#0a1122',
        primary: '#0ea5e9',
        text: '#f8fafc',
    },
    purple: {
        background: '#07000d',
        paper: '#0e041b',
        primary: '#9333ea',
        text: '#faf5ff',
    },
    'catppuccin-mocha': {
        background: '#11111b',
        paper: '#181825',
        primary: '#89b4fa',
        text: '#cdd6f4',
    },
    'catppuccin-macchiato': {
        background: '#181926',
        paper: '#1e2030',
        primary: '#8aadf4',
        text: '#cad3f5',
    },
    'catppuccin-frappe': {
        background: '#232634',
        paper: '#292c3c',
        primary: '#8caaee',
        text: '#c6d0f5',
    },

    amoled: {
        background: '#000000',
        paper: '#000000',
        primary: '#ffffff',
        text: '#ffffff',
    },
    grey: {
        background: '#0c0c0c',
        paper: '#141414',
        primary: '#ffffff',
        text: '#ededed',
    },
    ocean: {
        background: '#0a0c12',
        paper: '#0d111a',
        primary: '#ffffff',
        text: '#f1f5f9',
    },
    'ocean-dark': {
        background: '#05070a',
        paper: '#080b12',
        primary: '#ffffff',
        text: '#f1f5f9',
    },
    tokyonight: {
        background: '#1a1b26',
        paper: '#24283b',
        primary: '#7aa2f7',
        text: '#c0caf5',
    },
    light: {
        background: '#f8fafc',
        paper: '#ffffff',
        primary: '#0284c7',
        text: '#0f172a',
    },
};

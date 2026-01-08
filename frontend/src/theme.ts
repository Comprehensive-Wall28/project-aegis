import { createTheme, alpha } from '@mui/material/styles';

declare module '@mui/material/Paper' {
    interface PaperPropsVariantOverrides {
        glass: true;
    }
}

// Typography setup
const FONT_PRIMARY = 'Outfit, sans-serif';
const FONT_SECONDARY = 'Inter, sans-serif';

export type ThemeMode = 'default' | 'purple' | 'catppuccin' | 'amoled' | 'light';

export const getTheme = (mode: ThemeMode) => {

    // Palette definitions based on index.css
    const palettes = {
        default: {
            background: {
                default: '#020617', // Slate 950 (Deep Cosmos)
                paper: '#0f172a',   // Slate 900
            },
            primary: {
                main: '#0ea5e9',    // Sky 500
                contrastText: '#020617',
            },
            secondary: {
                main: '#0f172a', // Slate 900
            },
            text: {
                primary: '#f8fafc', // Slate 50
                secondary: '#94a3b8', // Slate 400
            },
            divider: 'rgba(148, 163, 184, 0.1)',
        },
        catppuccin: {
            background: {
                default: '#1e1e2e',
                paper: '#313244',
            },
            primary: {
                main: '#89b4fa', // Blue
                contrastText: '#1e1e2e',
            },
            secondary: {
                main: '#a6e3a1', // Green
            },
            text: {
                primary: '#cdd6f4',
                secondary: '#a6adc8',
            },
            divider: 'rgba(205, 214, 244, 0.1)',
        },
        purple: {
            background: {
                default: '#0d0015', // Deep Purple/Black
                paper: '#1a0a2e',   // Dark Purple
            },
            primary: {
                main: '#a855f7',    // Purple 500
                contrastText: '#0d0015',
            },
            secondary: {
                main: '#7c3aed',    // Violet 600
            },
            text: {
                primary: '#faf5ff', // Purple 50
                secondary: '#c4b5fd', // Violet 300
            },
            divider: 'rgba(168, 85, 247, 0.15)',
        },
        amoled: {
            background: {
                default: '#000000',
                paper: '#000000',
            },
            primary: {
                main: '#ffffff',
                contrastText: '#000000',
            },
            secondary: {
                main: '#ffffff',
            },
            text: {
                primary: '#ffffff',
                secondary: '#a1a1aa',
            },
            divider: 'rgba(255, 255, 255, 0.2)',
        },
        light: {
            background: {
                default: '#f8fafc', // Slate 50
                paper: '#ffffff',   // White
            },
            primary: {
                main: '#0284c7',    // Sky 600
                contrastText: '#ffffff',
            },
            secondary: {
                main: '#e2e8f0',    // Slate 200
            },
            text: {
                primary: '#0f172a', // Slate 900
                secondary: '#475569', // Slate 600
            },
            divider: 'rgba(15, 23, 42, 0.1)',
        },
    };

    const selectedPalette = palettes[mode];

    return createTheme({
        palette: {
            mode: mode === 'light' ? 'light' : 'dark',
            ...selectedPalette,
        },
        typography: {
            fontFamily: FONT_PRIMARY,
            h1: { fontWeight: 700, fontFamily: FONT_PRIMARY },
            h2: { fontWeight: 700, fontFamily: FONT_PRIMARY },
            h3: { fontWeight: 600, fontFamily: FONT_PRIMARY },
            h4: { fontWeight: 600, fontFamily: FONT_PRIMARY },
            h5: { fontWeight: 600, fontFamily: FONT_PRIMARY },
            h6: { fontWeight: 600, fontFamily: FONT_PRIMARY },
            body1: { fontFamily: FONT_SECONDARY },
            body2: { fontFamily: FONT_SECONDARY },
            button: { textTransform: 'none', fontWeight: 600 },
        },
        shape: {
            borderRadius: 12, // Base border radius, overridden by specific components often
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
                        '&::-webkit-scrollbar': {
                            width: 8,
                            height: 8,
                        },
                        '&::-webkit-scrollbar-track': {
                            background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 4,
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            background: 'rgba(255, 255, 255, 0.2)',
                        },
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        padding: '8px 20px',
                    },
                    contained: {
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: 'none',
                        },
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backgroundColor: selectedPalette.background.paper,
                        border: `1px solid ${selectedPalette.divider}`,
                    },
                },
                variants: [
                    {
                        props: { variant: 'glass' as any },
                        style: {
                            background: alpha(selectedPalette.background.paper, 0.4),
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: `1px solid ${alpha(selectedPalette.primary.main || '#ffffff', 0.1)}`,
                        },
                    },
                ],
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        borderRadius: 12,
                    },
                },
            },
        },
    });
};

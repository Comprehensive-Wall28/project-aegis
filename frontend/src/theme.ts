import { createTheme } from '@mui/material/styles';

declare module '@mui/material/Paper' {
    interface PaperPropsVariantOverrides {
        glass: true;
        translucent: true;
        solid: true;
    }
}

// Typography setup
const FONT_PRIMARY = 'Outfit, sans-serif';
const FONT_SECONDARY = 'Inter, sans-serif';

export type ThemeMode = 'default' | 'purple' | 'catppuccin' | 'amoled' | 'grey' | 'ocean' | 'light' | 'tokyonight';

export const getTheme = (mode: ThemeMode) => {

    // Palette definitions based on index.css
    const palettes = {
        default: {
            background: {
                default: '#020617', // Slate 950 (Deep Cosmos)
                paper: '#0a1122',   // Refined middle ground (Adjusted from #0c1425)
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
            divider: 'rgba(148, 163, 184, 0.2)',
        },
        catppuccin: {
            background: {
                default: '#11111b', // Crust (Darkest)
                paper: '#181825',   // Mantle (Darker)
            },
            primary: {
                main: '#89b4fa',    // Blue
                contrastText: '#1e1e2e', // Base
            },
            secondary: {
                main: '#cba6f7',    // Mauve (Changed from Green for better aesthetics)
            },
            text: {
                primary: '#cdd6f4', // Text
                secondary: '#a6adc8', // Subtext 0
            },
            error: {
                main: '#f38ba8',    // Red
            },
            warning: {
                main: '#fab387',    // Peach
            },
            info: {
                main: '#74c7ec',    // Sapphire
            },
            success: {
                main: '#a6e3a1',    // Green
            },
            divider: 'rgba(108, 112, 134, 0.25)', // Overlay 0 with alpha increased for better structural definition
        },
        purple: {
            background: {
                default: '#07000d', // Deepest Purple/Black
                paper: '#0e041b',   // Slightly Lighter Refined Purple
            },
            primary: {
                main: '#9333ea',    // Purple 600 (Darker than 500)
                contrastText: '#faf5ff',
            },
            secondary: {
                main: '#6d28d9',    // Violet 700 (Darker than 600)
            },
            text: {
                primary: '#faf5ff', // Purple 50
                secondary: '#a78bfa', // Violet 400 (Darker than 300)
            },
            divider: 'rgba(147, 51, 234, 0.2)',
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
            divider: 'rgba(255, 255, 255, 0.25)',
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
            divider: '#e2e8f0', // Slate 200 (More visible border)
        },
        grey: {
            background: {
                default: '#0c0c0c',
                paper: '#141414',
            },
            primary: {
                main: '#ffffff',
                contrastText: '#000000',
            },
            secondary: {
                main: '#27272a',
            },
            text: {
                primary: '#ededed',
                secondary: '#a1a1aa',
            },
            divider: 'rgba(255, 255, 255, 0.25)',
        },
        ocean: {
            background: {
                default: '#0a0c12',
                paper: '#0d111a',
            },
            primary: {
                main: '#ffffff',
                contrastText: '#000000',
            },
            secondary: {
                main: '#1e293b',
            },
            text: {
                primary: '#f1f5f9',
                secondary: '#94a3b8',
            },
            divider: 'rgba(148, 163, 184, 0.2)',
        },
        tokyonight: {
            background: {
                default: '#13141b', // Even darker for outer depth
                paper: '#181923',   // Tokyo Night (Night) - Darker center area
            },
            primary: {
                main: '#7aa2f7',    // Tokyo Night Blue
                contrastText: '#1a1b26',
            },
            secondary: {
                main: '#bb9af7',    // Tokyo Night Magenta
            },
            text: {
                primary: '#c0caf5', // Tokyo Night (Terminal White)
                secondary: '#9aa5ce', // Improved readability (Markdown Text/Gray-Blue)
            },
            error: {
                main: '#f7768e',
            },
            warning: {
                main: '#ff9e64',
            },
            info: {
                main: '#7dcfff',
            },
            success: {
                main: '#9ece6a',
            },
            divider: 'rgba(74, 86, 132, 0.4)', // Higher visibility for tokyonight specifically
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
                            background: 'rgba(255, 255, 255, 0.25)',
                            borderRadius: 4,
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            background: 'rgba(255, 255, 255, 0.4)',
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
                            background: selectedPalette.background.paper,
                            border: `1px solid ${selectedPalette.divider}`,
                        },
                    },
                    {
                        props: { variant: 'solid' as any },
                        style: {
                            background: selectedPalette.background.paper,
                            backgroundImage: 'none',
                            backdropFilter: 'none',
                            WebkitBackdropFilter: 'none',
                            border: `1px solid ${selectedPalette.divider}`,
                        },
                    },
                    {
                        props: { variant: 'translucent' as any },
                        style: {
                            background: selectedPalette.background.paper,
                            border: `1px solid ${selectedPalette.divider}`,
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

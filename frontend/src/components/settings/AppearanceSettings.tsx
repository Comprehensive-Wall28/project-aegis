import {
    Box,
    Paper,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import { Check as CheckIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useThemeStore, THEME_ORDER, THEME_DISPLAY_NAMES, type Theme } from '@/stores/themeStore';
import { usePreferenceStore } from '@/stores/preferenceStore';
import authService from '@/services/authService';
import { Button, Slider, Stack } from '@mui/material';

// Theme palette preview colors (matches theme.ts definitions)
const THEME_PALETTES: Record<Theme, { background: string; paper: string; primary: string; text: string }> = {
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
    catppuccin: {
        background: '#1e1e2e',
        paper: '#313244',
        primary: '#89b4fa',
        text: '#cdd6f4',
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

interface AppearanceSettingsProps {
    onNotification: (type: 'success' | 'error', message: string) => void;
}

export function AppearanceSettings({ onNotification }: AppearanceSettingsProps) {
    const muiTheme = useTheme();
    const { theme: currentTheme, setTheme } = useThemeStore();

    const handleThemeSelect = (themeName: Theme) => {
        setTheme(themeName);
        onNotification('success', `Theme changed to ${THEME_DISPLAY_NAMES[themeName]}`);
    };

    const sharedPaperStyles = {
        p: { xs: 2, sm: 4 },
        borderRadius: '16px',
        bgcolor: muiTheme.palette.background.paper,
        border: `1px solid ${alpha(muiTheme.palette.divider, 0.08)}`,
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
    };

    const backgroundBlur = usePreferenceStore((state) => state.backgroundBlur);
    const backgroundOpacity = usePreferenceStore((state) => state.backgroundOpacity);
    const backgroundImage = usePreferenceStore((state) => state.backgroundImage);
    const setBackgroundImage = usePreferenceStore((state) => state.setBackgroundImage);
    const setBackgroundBlur = usePreferenceStore((state) => state.setBackgroundBlur);
    const setBackgroundOpacity = usePreferenceStore((state) => state.setBackgroundOpacity);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper sx={sharedPaperStyles}>
                {/* ... existing code ... */}
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 700,
                        color: 'text.secondary',
                        letterSpacing: '0.1em',
                        fontSize: '10px',
                        mb: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    THEME
                </Typography>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Choose a theme that suits your style. Changes are applied instantly.
                </Typography>

                {/* Theme Grid */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(3, 1fr)',
                            md: 'repeat(4, 1fr)',
                        },
                        gap: 2,
                    }}
                >
                    {THEME_ORDER.map((themeName) => {
                        const palette = THEME_PALETTES[themeName];
                        const isSelected = currentTheme === themeName;

                        return (
                            <Box
                                key={themeName}
                                onClick={() => handleThemeSelect(themeName)}
                                sx={{
                                    cursor: 'pointer',
                                    p: 1.5,
                                    borderRadius: '12px',
                                    border: `2px solid ${isSelected ? muiTheme.palette.primary.main : alpha(muiTheme.palette.divider, 0.06)}`,
                                    bgcolor: isSelected ? alpha(muiTheme.palette.primary.main, 0.2) : 'transparent',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    '&:hover': {
                                        borderColor: isSelected ? muiTheme.palette.primary.main : alpha(muiTheme.palette.common.white, 0.3),
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                {/* Selection Indicator */}
                                {isSelected && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            bgcolor: muiTheme.palette.primary.main,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <CheckIcon sx={{ fontSize: 14, color: muiTheme.palette.primary.contrastText }} />
                                    </Box>
                                )}

                                {/* Color Preview */}
                                <Box
                                    sx={{
                                        width: '100%',
                                        aspectRatio: '16/9',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        mb: 1.5,
                                        border: `1px solid ${alpha(muiTheme.palette.divider, 0.06)}`,
                                    }}
                                >
                                    {/* Background layer */}
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            bgcolor: palette.background,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            p: 1,
                                        }}
                                    >
                                        {/* Paper card mockup */}
                                        <Box
                                            sx={{
                                                width: '80%',
                                                height: '70%',
                                                bgcolor: palette.paper,
                                                borderRadius: '4px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                p: 0.75,
                                                gap: 0.5,
                                            }}
                                        >
                                            {/* Primary accent bar */}
                                            <Box
                                                sx={{
                                                    width: '50%',
                                                    height: 4,
                                                    bgcolor: palette.primary,
                                                    borderRadius: '2px',
                                                }}
                                            />
                                            {/* Text line */}
                                            <Box
                                                sx={{
                                                    width: '70%',
                                                    height: 3,
                                                    bgcolor: alpha(palette.text, 0.5),
                                                    borderRadius: '1px',
                                                }}
                                            />
                                            <Box
                                                sx={{
                                                    width: '40%',
                                                    height: 3,
                                                    bgcolor: alpha(palette.text, 0.3),
                                                    borderRadius: '1px',
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Theme Name */}
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: isSelected ? 700 : 500,
                                        color: isSelected ? 'primary.main' : 'text.primary',
                                        textAlign: 'center',
                                    }}
                                >
                                    {THEME_DISPLAY_NAMES[themeName]}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>

            {/* Background Image Settings */}
            <Paper sx={sharedPaperStyles}>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 700,
                        color: 'text.secondary',
                        letterSpacing: '0.1em',
                        fontSize: '10px',
                        mb: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    SITE BACKGROUND
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                            Custom Background Image
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {backgroundImage
                                ? 'You have a custom background image set from your vault.'
                                : 'No custom background image set. Set an image from your vault from context menu (right-click) and selecting "Set as background".'}
                        </Typography>
                    </Box>

                    {backgroundImage && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={async () => {
                                try {
                                    await authService.updateProfile({ preferences: { backgroundImage: null } });
                                    setBackgroundImage(null);
                                    onNotification('success', 'Background image removed');
                                } catch (error) {
                                    console.error('Failed to remove background:', error);
                                    onNotification('error', 'Failed to remove background image');
                                }
                            }}
                        >
                            Remove
                        </Button>
                    )}
                </Box>

                {backgroundImage && (
                    <Box sx={{ mt: 4, px: 1 }}>
                        <Stack spacing={4}>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
                                    BLUR INTENSITY
                                </Typography>
                                <Slider
                                    value={backgroundBlur}
                                    min={0}
                                    max={20}
                                    step={1}
                                    onChange={(_, value) => setBackgroundBlur(value as number)}
                                    onChangeCommitted={(_, value) => authService.updateProfile({ preferences: { backgroundBlur: value as number } })}
                                    valueLabelDisplay="auto"
                                    sx={{ color: 'primary.main' }}
                                />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
                                    OPACITY
                                </Typography>
                                <Slider
                                    value={backgroundOpacity}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    onChange={(_, value) => setBackgroundOpacity(value as number)}
                                    onChangeCommitted={(_, value) => authService.updateProfile({ preferences: { backgroundOpacity: value as number } })}
                                    valueLabelDisplay="auto"
                                    sx={{ color: 'primary.main' }}
                                />
                            </Box>
                        </Stack>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}

export default AppearanceSettings;

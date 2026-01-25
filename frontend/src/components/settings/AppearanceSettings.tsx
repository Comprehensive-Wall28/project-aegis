import {
    Box,
    Paper,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useThemeStore, THEME_ORDER, THEME_DISPLAY_NAMES, type Theme } from '@/stores/themeStore';
import { usePreferenceStore } from '@/stores/preferenceStore';
import authService from '@/services/authService';
import { Button, Slider, Stack } from '@mui/material';

import { ThemePreviewCard } from '@/components/common/ThemePreviewCard';

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
                    {THEME_ORDER.map((themeName) => (
                        <ThemePreviewCard
                            key={themeName}
                            themeName={themeName}
                            isSelected={currentTheme === themeName}
                            onClick={() => handleThemeSelect(themeName)}
                        />
                    ))}
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

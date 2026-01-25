import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { THEME_DISPLAY_NAMES, type Theme } from '@/stores/themeStore';
import { THEME_PALETTES } from '@/constants/themePalettes';

interface ThemePreviewCardProps {
    themeName: Theme;
    isSelected: boolean;
    onClick: () => void;
}

export function ThemePreviewCard({ themeName, isSelected, onClick }: ThemePreviewCardProps) {
    const muiTheme = useTheme();
    const palette = THEME_PALETTES[themeName];

    return (
        <Box
            onClick={onClick}
            sx={{
                cursor: 'pointer',
                p: 1.5,
                borderRadius: '12px',
                border: `2px solid ${isSelected ? muiTheme.palette.primary.main : alpha(muiTheme.palette.divider, 0.06)}`,
                bgcolor: isSelected ? alpha(muiTheme.palette.primary.main, 0.2) : 'transparent',
                transition: 'border-color 0.2s ease',
                position: 'relative',
                '&:hover': {
                    borderColor: isSelected ? muiTheme.palette.primary.main : alpha(muiTheme.palette.common.white, 0.3),
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
}

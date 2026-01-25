import {
    Box,
    Typography,
    Paper,
    Backdrop,
    alpha,
    IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { useThemeStore, THEME_ORDER, type Theme } from '@/stores/themeStore';
import { ThemePreviewCard } from '@/components/common/ThemePreviewCard';

interface ThemeSelectorOverlayProps {
    open: boolean;
    onClose: () => void;
}

export function ThemeSelectorOverlay({ open, onClose }: ThemeSelectorOverlayProps) {
    const { theme: currentTheme, setTheme } = useThemeStore();

    const handleThemeSelect = (themeName: Theme) => {
        setTheme(themeName);
    };

    return (
        <AnimatePresence>
            {open && (
                <Backdrop
                    open={open}
                    onClick={onClose}
                    sx={{
                        zIndex: 1300,
                        backdropFilter: 'blur(4px)',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                    }}
                >
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                            width: '100%',
                            maxWidth: 800,
                            maxHeight: '90vh',
                            m: 2,
                            p: { xs: 2.5, sm: 4 },
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            position: 'relative',
                            bgcolor: 'background.paper',
                            backgroundImage: 'none',
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Select Theme
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Choose a theme to personalize your experience
                                </Typography>
                            </Box>
                            <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
                                <CloseIcon />
                            </IconButton>
                        </Box>

                        {/* Theme Grid */}
                        <Box
                            sx={{
                                overflowY: 'auto',
                                pr: 1,
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: 'repeat(2, 1fr)',
                                    sm: 'repeat(3, 1fr)',
                                    md: 'repeat(4, 1fr)',
                                },
                                gap: 2,
                                pb: 2,
                                '&::-webkit-scrollbar': {
                                    width: '6px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    background: 'transparent',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    background: (theme) => alpha(theme.palette.text.secondary, 0.1),
                                    borderRadius: '3px',
                                },
                                '&::-webkit-scrollbar-thumb:hover': {
                                    background: (theme) => alpha(theme.palette.text.secondary, 0.2),
                                },
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
                </Backdrop>
            )}
        </AnimatePresence>
    );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { useThemeStore } from '@/stores/themeStore';
import authService from '@/services/authService';
import { clearStoredSeed } from '@/lib/cryptoUtils';
import { motion } from 'framer-motion';
import {
    Person as UserIcon,
    Logout as LogOutIcon,
    KeyboardArrowDown as ChevronDownIcon,
    Settings as SettingsIcon,
    Palette as PaletteIcon,
    Menu as MenuIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    IconButton,
    alpha,
    useTheme,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    Divider,
    Tooltip
} from '@mui/material';

interface TopHeaderProps {
    onMobileMenuOpen: () => void;
}

export function TopHeader({ onMobileMenuOpen }: TopHeaderProps) {
    const navigate = useNavigate();
    const { user, clearSession } = useSessionStore();
    const { theme: currentTheme, toggleTheme } = useThemeStore();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const theme = useTheme();

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        await authService.logout();
        clearStoredSeed();
        clearSession();
        navigate('/');
        handleCloseMenu();
    };

    const handleNavigate = (path: string) => {
        navigate(path);
        handleCloseMenu();
    };

    const username = user?.username || user?.email?.split('@')[0] || 'Agent';

    return (
        <Box
            component="header"
            sx={{
                height: { xs: 48, sm: 56 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pl: { xs: 2, sm: 3, lg: 3 },
                pr: { xs: 2, sm: 3, lg: 3 }, // Reset extra pr
                bgcolor: 'transparent'
            }}
        >
            {/* Left: Section Title & Welcome Footprint */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        textTransform: 'uppercase',
                        trackingSpacing: '0.2em',
                        fontWeight: 800,
                        color: alpha(theme.palette.text.secondary, 0.5),
                        lineHeight: 1,
                        mb: 0.5,
                        fontSize: { xs: '8px', sm: '9px' },
                        letterSpacing: 2,
                        display: { xs: 'none', sm: 'block' }
                    }}
                >
                    System Overview
                </Typography>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 900,
                        letterSpacing: -1,
                        color: 'text.primary',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 1.5,
                        fontSize: { xs: '1.25rem', sm: '1.5rem' }
                    }}
                >
                    Dashboard
                    <Typography
                        component="span"
                        variant="caption"
                        sx={{
                            fontWeight: 500,
                            letterSpacing: 0,
                            color: alpha(theme.palette.text.secondary, 0.4),
                            display: { xs: 'none', md: 'inline' }
                        }}
                    >
                        Welcome, {username}
                    </Typography>
                </Typography>
            </Box>

            {/* Right: Actions & User Profile */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
                {/* Theme Toggle - Desktop only */}
                <Tooltip title={`Theme: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`}>
                    <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                        <IconButton
                            onClick={toggleTheme}
                            sx={{
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                    color: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                                }
                            }}
                        >
                            <PaletteIcon />
                        </IconButton>
                    </Box>
                </Tooltip>

                {/* User Profile Dropdown - Desktop only */}
                <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                    <IconButton
                        onClick={handleOpenMenu}
                        sx={{
                            p: 0.5,
                            pr: 1.5,
                            borderRadius: 4,
                            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) },
                            gap: 1.5,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                color: theme.palette.primary.main
                            }}
                        >
                            <UserIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.primary',
                                fontWeight: 600,
                                display: { xs: 'none', md: 'block' }
                            }}
                        >
                            {username}
                        </Typography>
                        <ChevronDownIcon
                            sx={{
                                fontSize: 18,
                                color: 'text.secondary',
                                transform: anchorEl ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s'
                            }}
                        />
                    </IconButton>

                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleCloseMenu}
                        PaperProps={{
                            sx: {
                                mt: 2,
                                width: 240,
                                p: 1,
                                borderRadius: '16px',
                                bgcolor: theme.palette.background.paper,
                                backgroundImage: 'none',
                                boxShadow: theme.shadows[20],
                                border: `1px solid ${alpha(theme.palette.divider, 0.25)}`,
                            }
                        }}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                        <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1 }}>
                                {username}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block', mt: 0.5 }}>
                                {user?.email}
                            </Typography>
                        </Box>
                        <Divider sx={{ my: 1, opacity: 0.5 }} />
                        <MenuItem onClick={() => handleNavigate('/dashboard/security')} sx={{ borderRadius: 3, gap: 1.5, py: 1 }}>
                            <ListItemIcon sx={{ minWidth: 0, color: 'text.secondary' }}>
                                <SettingsIcon sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Settings</Typography>
                        </MenuItem>
                        <MenuItem onClick={handleLogout} sx={{ borderRadius: 3, gap: 1.5, py: 1, color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.15) } }}>
                            <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                                <LogOutIcon sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Logout</Typography>
                        </MenuItem>
                    </Menu>
                </Box>

                {/* Mobile Menu Button - Far right */}
                <IconButton
                    onClick={onMobileMenuOpen}
                    sx={{
                        display: { lg: 'none' },
                        p: 1.5, // Increased touch area
                        color: theme.palette.text.secondary,
                        '&:hover': {
                            color: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.05)
                        }
                    }}
                >
                    <MenuIcon sx={{ fontSize: 28 }} />
                </IconButton>
            </Box>
        </Box>
    );
}

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
    Menu as MenuIcon,
    Close as XIcon,
    Palette as PaletteIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import {
    AppBar,
    Toolbar,
    Box,
    Typography,
    Button,
    IconButton,
    Container,
    alpha,
    useTheme,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Tooltip,
    Divider
} from '@mui/material';
import { AegisLogo } from '@/components/AegisLogo';
import performLogoutCleanup from '@/utils/logoutCleanup';

import { useSessionStore } from '@/stores/sessionStore';
import { useThemeStore } from '@/stores/themeStore';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useAuthModalStore } from '@/stores/authModalStore';

export function Navbar() {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSessionStore();
    const { theme: currentTheme, toggleTheme } = useThemeStore();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Auth Dialog Global State
    const { isOpen: isAuthOpen, mode: authMode, openModal, closeModal } = useAuthModalStore();

    // Security: Scrub any PQC keys from localStorage (fix for leaked keys)
    useEffect(() => {
        const scrubKeys = () => {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('aegis_pqc_keys_')) {
                    keysToRemove.push(key);
                }
            }
            if (keysToRemove.length > 0) {
                keysToRemove.forEach(k => localStorage.removeItem(k));
                console.log('Secure Scrub: Removed leaked PQC keys from localStorage');
            }
        };
        scrubKeys();
    }, []);



    // Check if we should show login dialog from redirect
    useEffect(() => {
        if (location.state?.showLogin) {
            openModal('login');
            // Clear status to prevent popup from reopening on refresh
            navigate(location.pathname, { replace: true, state: { ...location.state, showLogin: undefined } });
        }
    }, [location.state, location.pathname, navigate, openModal]);

    const handleLogout = async () => {
        await performLogoutCleanup();
    };

    const openAuth = (mode: 'login' | 'register') => {
        openModal(mode);
    };

    return (
        <>
            <AppBar
                position="fixed"
                sx={{
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'calc(100% - 32px)',
                    maxWidth: 1400,
                    borderRadius: 4,
                    // Glass Effect
                    bgcolor: alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: theme.shadows[4],
                    backgroundImage: 'none',
                    zIndex: theme.zIndex.drawer + 1
                }}
            >
                <Container maxWidth="xl">
                    <Toolbar
                        disableGutters
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            minHeight: { xs: 64, md: 72 }
                        }}
                    >
                        {/* Logo */}
                        <Box
                            component={RouterLink}
                            to="/"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                textDecoration: 'none',
                                color: 'inherit'
                            }}
                        >
                            <AegisLogo size={32} disableLink />
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 900,
                                    letterSpacing: -1,
                                    color: 'text.primary',
                                    display: { xs: 'none', sm: 'block' }
                                }}
                            >
                                Aegis
                            </Typography>
                        </Box>

                        {/* Navigation Links - Desktop */}
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, alignItems: 'center', transform: 'translateY(-1px)' }}>
                            {[
                                { label: 'Features', href: '#features' },
                                { label: 'How it works', href: '#how-it-works' },
                                { label: 'Security', href: '#security' }
                            ].map((item) => (
                                <Button
                                    key={item.label}
                                    component="a"
                                    href={item.href}
                                    sx={{
                                        color: 'text.secondary',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                                    }}
                                >
                                    {item.label}
                                </Button>
                            ))}


                            {/* Theme Toggle */}
                            <Box sx={{ ml: 2, pl: 2, borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                <Tooltip title={`Theme: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`}>
                                    <IconButton
                                        onClick={toggleTheme}
                                        sx={{
                                            color: 'text.secondary',
                                            '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) }
                                        }}
                                    >
                                        <PaletteIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>

                        {/* Right Section / User Profile */}
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2, transform: 'translateY(-1px)' }}>
                            {user ? (
                                <>
                                    <Button
                                        component={RouterLink}
                                        to="/dashboard"
                                        endIcon={<ChevronRightIcon />}
                                        sx={{
                                            color: 'info.main',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            '&:hover': { color: 'info.light', bgcolor: 'transparent' }
                                        }}
                                    >
                                        Dashboard
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleLogout}
                                        sx={{
                                            borderRadius: 2,
                                            borderColor: alpha(theme.palette.divider, 0.1),
                                            color: 'text.primary'
                                        }}
                                    >
                                        Logout
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        onClick={() => openAuth('login')}
                                        sx={{
                                            color: 'text.primary',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                                        }}
                                    >
                                        Login
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => openAuth('register')}
                                        sx={{
                                            borderRadius: 2.5,
                                            px: 3,
                                            fontWeight: 700,
                                            boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                                            '&:hover': {
                                                boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`
                                            }
                                        }}
                                    >
                                        Get Started
                                    </Button>
                                </>
                            )}
                        </Box>

                        {/* Mobile Menu Icon */}
                        <IconButton
                            onClick={() => setMobileOpen(true)}
                            sx={{ display: { md: 'none' }, color: 'text.primary' }}
                        >
                            <MenuIcon />
                        </IconButton>
                    </Toolbar>
                </Container>
            </AppBar>

            {/* Mobile Drawer */}
            <Drawer
                anchor="top"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                sx={{
                    '& .MuiDrawer-paper': {
                        bgcolor: theme.palette.background.default,
                        px: 2,
                        py: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <AegisLogo size={32} />
                    <IconButton onClick={() => setMobileOpen(false)}><XIcon /></IconButton>
                </Box>
                <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[
                        { label: 'Features', href: '#features' },
                        { label: 'How it works', href: '#how-it-works' },
                        { label: 'Security', href: '#security' }
                    ].map((item) => (
                        <ListItem key={item.label} disablePadding>
                            <ListItemButton
                                component="a"
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                sx={{ borderRadius: 2 }}
                            >
                                <ListItemText primary={item.label} slotProps={{ primary: { fontWeight: 600 } }} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                    <ListItem disablePadding>
                        <ListItemButton onClick={toggleTheme} sx={{ borderRadius: 2 }}>
                            <ListItemText
                                primary="Switch Theme"
                                secondary={currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}
                                slotProps={{ primary: { fontWeight: 600 } }}
                            />
                        </ListItemButton>
                    </ListItem>
                </List>
                <Divider sx={{ my: 1, opacity: 0.1 }} />
                {user ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
                        <Button
                            variant="text"
                            component={RouterLink}
                            to="/dashboard"
                            fullWidth
                            sx={{ color: 'info.main', fontWeight: 700 }}
                        >
                            Go to Dashboard
                        </Button>
                        <Button variant="outlined" fullWidth onClick={handleLogout}>Logout</Button>
                    </Box>
                ) : (
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => {
                            openAuth('login');
                            setMobileOpen(false);
                        }}
                        sx={{ py: 1.5, fontWeight: 700 }}
                    >
                        Login / Register
                    </Button>
                )}
            </Drawer>

            {/* Replaced Dialog with AuthDialog */}
            <AuthDialog
                open={isAuthOpen}
                onClose={closeModal}
                initialMode={authMode}
            />
        </>
    );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Shield as VaultIcon,
    BarChart as LineChartIcon,
    // Fingerprint as FingerprintIcon,
    Settings as SettingsIcon,
    Logout as LogOutIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    FolderOpen as FolderOpenIcon,
    CalendarMonth as CalendarIcon,
    CheckCircle as TasksIcon,
    Share as ShareIcon,
    Palette as PaletteIcon,
    NoteAlt as NotesIcon,
} from '@mui/icons-material';
import {
    Box,
    Typography,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    alpha,
    useTheme,
    Tooltip,
    Divider
} from '@mui/material';
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/stores/sessionStore';
import { useThemeStore } from '@/stores/themeStore';
import { AegisLogo } from '@/components/AegisLogo';
import authService from '@/services/authService';
import { clearStoredSeed } from '@/lib/cryptoUtils';

const navItems = [
    { name: 'Vault', href: '/dashboard', icon: VaultIcon },
    { name: 'Social', icon: ShareIcon, href: '/dashboard/social' },
    { name: 'Files', href: '/dashboard/files', icon: FolderOpenIcon },
    { name: 'Tasks', href: '/dashboard/tasks', icon: TasksIcon },
    { name: 'Notes', href: '/dashboard/notes', icon: NotesIcon },
    { name: 'GPA', href: '/dashboard/gpa', icon: LineChartIcon },
    { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarIcon },
    // { name: 'ZKP Verifier', href: '/dashboard/zkp', icon: FingerprintIcon },
    { name: 'Settings', href: '/dashboard/security', icon: SettingsIcon },
];


interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

interface SidebarContentProps {
    isCollapsed: boolean;
    onToggle: () => void;
    isMobile?: boolean;
    onClose?: () => void;
}

const SidebarContent = memo(({ isCollapsed, onToggle, isMobile, onClose }: SidebarContentProps) => {
    const theme = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { clearSession } = useSessionStore();
    const { theme: currentTheme, toggleTheme } = useThemeStore();

    const handleLogout = async () => {
        await authService.logout();
        clearStoredSeed();
        clearSession();
        navigate('/');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', h: '100%', height: '100%' }}>
            {/* Logo */}
            <Box
                component={Link}
                to="/"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 56,
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': {
                        '& .MuiTypography-root': { color: 'primary.main' },
                        '& .logo-hover': { opacity: 0.8 }
                    }
                }}
            >
                <Box
                    sx={{
                        minWidth: 64,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <AegisLogo size={28} disableLink className="logo-hover transition-opacity" />
                </Box>
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <Typography
                            component={motion.span}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                color: 'text.primary',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                            }}
                        >
                            Aegis
                        </Typography>
                    )}
                </AnimatePresence>
            </Box>

            {/* Navigation */}
            <Box sx={{ flex: 1, py: 2, px: 1 }}>
                <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <ListItem key={item.name} disablePadding sx={{ display: 'block' }}>
                                <Tooltip title={isCollapsed ? item.name : ''} placement="right">
                                    <ListItemButton
                                        component={Link}
                                        to={item.href}
                                        onClick={() => onClose?.()}
                                        sx={{
                                            minHeight: 48,
                                            justifyContent: 'initial',
                                            px: 0,
                                            borderRadius: 3,
                                            bgcolor: isActive ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                                            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                            border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.3) : 'transparent'}`,
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                borderColor: alpha(theme.palette.primary.main, 0.4),
                                                color: theme.palette.primary.main
                                            },
                                            position: 'relative'
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 48,
                                                mr: 0,
                                                justifyContent: 'center',
                                                color: 'inherit'
                                            }}
                                        >
                                            <Icon sx={{ fontSize: 24 }} />
                                        </ListItemIcon>
                                        {!isCollapsed && (
                                            <ListItemText
                                                primary={item.name}
                                                slotProps={{
                                                    primary: {
                                                        fontSize: '14px',
                                                        fontWeight: isActive ? 700 : 500
                                                    }
                                                }}
                                            />
                                        )}
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>

            {/* Bottom Section */}
            <Box sx={{ p: 1 }}>
                <List disablePadding>
                    {isMobile && (
                        <>
                            <ListItem disablePadding>
                                <ListItemButton
                                    onClick={toggleTheme}
                                    sx={{
                                        minHeight: 44,
                                        px: 2.5,
                                        borderRadius: 3,
                                        color: theme.palette.text.secondary,
                                        '&:hover': {
                                            color: theme.palette.primary.main,
                                            bgcolor: alpha(theme.palette.primary.main, 0.05)
                                        }
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 0, mr: 2, justifyContent: 'center', color: 'inherit' }}>
                                        <PaletteIcon sx={{ fontSize: 20 }} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}
                                        slotProps={{ primary: { fontSize: '14px', fontWeight: 500 } }}
                                    />
                                </ListItemButton>
                            </ListItem>
                            <Divider sx={{ my: 1, mx: 2, opacity: 0.3 }} />
                        </>
                    )}

                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={handleLogout}
                            sx={{
                                minHeight: 48,
                                justifyContent: 'initial',
                                px: 0,
                                borderRadius: 3,
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.error.main, 0.15),
                                    color: theme.palette.error.main
                                }
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 48,
                                    mr: 0,
                                    justifyContent: 'center',
                                    color: 'inherit'
                                }}
                            >
                                <LogOutIcon sx={{ fontSize: 24 }} />
                            </ListItemIcon>
                            {!isCollapsed && (
                                <ListItemText
                                    primary="Logout"
                                    slotProps={{
                                        primary: {
                                            fontSize: '14px',
                                            fontWeight: 500
                                        }
                                    }}
                                />
                            )}
                        </ListItemButton>
                    </ListItem>

                    {!isMobile && (
                        <ListItem disablePadding sx={{ display: { xs: 'none', lg: 'block' }, mt: 0.5 }}>
                            <ListItemButton
                                onClick={onToggle}
                                sx={{
                                    minHeight: 40,
                                    justifyContent: 'center',
                                    px: 2.5,
                                    borderRadius: 3,
                                    color: 'text.secondary',
                                    '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) }
                                }}
                            >
                                {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                            </ListItemButton>
                        </ListItem>
                    )}
                </List>
            </Box>
        </Box>
    );
});

export function Sidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
    const theme = useTheme();

    return (
        <Box component="nav">
            {/* Desktop Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', lg: 'block' },
                    '& .MuiDrawer-paper': {
                        width: isCollapsed ? 64 : 224,
                        boxSizing: 'border-box',
                        bgcolor: 'transparent', // Transparent to show backdrop
                        border: 'none',
                        borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.05)}`,
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.shorter,
                        }),
                        overflowX: 'hidden'
                    },
                }}
                open
            >
                <SidebarContent isCollapsed={isCollapsed} onToggle={onToggle} />
            </Drawer>

            {/* Mobile Sidebar */}
            <Drawer
                variant="temporary"
                anchor="right" // Changed anchor to right
                open={isMobileOpen}
                onClose={onMobileClose}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', lg: 'none' },
                    '& .MuiDrawer-paper': {
                        width: 224,
                        boxSizing: 'border-box',
                        bgcolor: theme.palette.background.default,
                        borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        willChange: 'transform, opacity'
                    },
                }}
            >
                <SidebarContent
                    isCollapsed={false}
                    onToggle={() => { }}
                    isMobile
                    onClose={onMobileClose}
                />
            </Drawer>
        </Box>
    );
}

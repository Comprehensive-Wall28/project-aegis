import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Shield as VaultIcon,
    BarChart as LineChartIcon,
    Fingerprint as FingerprintIcon,
    Settings as SettingsIcon,
    Logout as LogOutIcon,
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    FolderOpen as FolderOpenIcon
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
    IconButton,
    alpha,
    useTheme,
    Tooltip
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/stores/sessionStore';
import { AegisLogo } from '@/components/AegisLogo';
import authService from '@/services/authService';

const navItems = [
    { name: 'Vault', href: '/dashboard', icon: VaultIcon },
    { name: 'Files', href: '/dashboard/files', icon: FolderOpenIcon },
    { name: 'GPA Tracker', href: '/dashboard/gpa', icon: LineChartIcon },
    { name: 'ZKP Verifier', href: '/dashboard/zkp', icon: FingerprintIcon },
    { name: 'Security', href: '/dashboard/security', icon: SettingsIcon },
];

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

interface SidebarContentProps {
    isCollapsed: boolean;
    onToggle: () => void;
    isMobile?: boolean;
    onClose?: () => void;
}

function SidebarContent({ isCollapsed, onToggle, isMobile, onClose }: SidebarContentProps) {
    const theme = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { clearSession } = useSessionStore();

    const handleLogout = async () => {
        await authService.logout();
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
                    gap: 2,
                    height: 56,
                    px: 2,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': {
                        '& .MuiTypography-root': { color: 'primary.main' },
                        '& .logo-hover': { opacity: 0.8 }
                    }
                }}
            >
                <AegisLogo size={28} disableLink className="logo-hover transition-opacity" />
                <AnimatePresence>
                    {!isCollapsed && (
                        <Typography
                            component={motion.span}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                color: 'text.primary',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                transition: 'color 0.2s'
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
                                            justifyContent: isCollapsed ? 'center' : 'initial',
                                            px: 2.5,
                                            borderRadius: 3,
                                            bgcolor: isActive ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                                            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                            border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.2) : 'transparent'}`,
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
                                                minWidth: 0,
                                                mr: isCollapsed ? 0 : 3,
                                                justifyContent: 'center',
                                                color: 'inherit'
                                            }}
                                        >
                                            <Icon sx={{ fontSize: 24 }} />
                                        </ListItemIcon>
                                        {!isCollapsed && (
                                            <ListItemText
                                                primary={item.name}
                                                primaryTypographyProps={{
                                                    fontSize: '14px',
                                                    fontWeight: isActive ? 700 : 500
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
            <Box sx={{ p: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <List disablePadding>
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={handleLogout}
                            sx={{
                                minHeight: 48,
                                justifyContent: isCollapsed ? 'center' : 'initial',
                                px: 2.5,
                                borderRadius: 3,
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                    color: theme.palette.error.main
                                }
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 0,
                                    mr: isCollapsed ? 0 : 3,
                                    justifyContent: 'center',
                                    color: 'inherit'
                                }}
                            >
                                <LogOutIcon sx={{ fontSize: 24 }} />
                            </ListItemIcon>
                            {!isCollapsed && (
                                <ListItemText
                                    primary="Logout"
                                    primaryTypographyProps={{
                                        fontSize: '14px',
                                        fontWeight: 500
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
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
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
                        bgcolor: theme.palette.background.default,
                        borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
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

            {/* Mobile Menu Button */}
            <IconButton
                onClick={() => setIsMobileOpen(true)}
                sx={{
                    display: { lg: 'none' },
                    position: 'fixed',
                    top: 12,
                    left: 12,
                    zIndex: theme.zIndex.appBar + 1,
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: 3,
                    p: 1.25
                }}
            >
                <MenuIcon />
            </IconButton>

            {/* Mobile Sidebar */}
            <Drawer
                variant="temporary"
                open={isMobileOpen}
                onClose={() => setIsMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', lg: 'none' },
                    '& .MuiDrawer-paper': {
                        width: 224,
                        boxSizing: 'border-box',
                        bgcolor: alpha(theme.palette.background.default, 0.95),
                        backdropFilter: 'blur(16px)',
                        borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    },
                }}
            >
                <SidebarContent
                    isCollapsed={false}
                    onToggle={() => { }}
                    isMobile
                    onClose={() => setIsMobileOpen(false)}
                />
            </Drawer>
        </Box>
    );
}

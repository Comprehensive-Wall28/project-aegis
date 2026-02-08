import { useState, memo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Shield as VaultIcon,
    FolderOpen as FolderOpenIcon,
    CalendarMonth as CalendarIcon,
    CheckCircle as TasksIcon,
    Share as ShareIcon,
    BarChart as LineChartIcon,
    NoteAlt as NotesIcon,
    Settings as SettingsIcon,
    Logout as LogOutIcon,
    MoreHoriz as MoreIcon,
    KeyboardArrowDown as HideIcon,
    KeyboardArrowUp as ShowIcon
} from '@mui/icons-material';
import {
    Box,
    alpha,
    useTheme,
    IconButton,
    Typography,
    Menu,
    MenuItem,
    ListItemIcon,
    Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import performLogoutCleanup from '@/utils/logoutCleanup';

interface MobileBottomBarProps {
    visible: boolean;
    onShow?: () => void;
}

const navItems = [
    { name: 'Vault', href: '/dashboard', icon: VaultIcon },
    { name: 'Social', href: '/dashboard/social', icon: ShareIcon },
    { name: 'Files', href: '/dashboard/files', icon: FolderOpenIcon },
    { name: 'Tasks', href: '/dashboard/tasks', icon: TasksIcon },
];

const overflowItems = [
    { name: 'Notes', href: '/dashboard/notes', icon: NotesIcon },
    { name: 'GPA', href: '/dashboard/gpa', icon: LineChartIcon },
    { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarIcon },
    { name: 'Settings', href: '/dashboard/security', icon: SettingsIcon },
];

export const MobileBottomBar = memo(({ visible: autoVisible, onShow }: MobileBottomBarProps) => {
    const theme = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [manuallyHidden, setManuallyHidden] = useState(false);

    // Final visibility is a combination of auto-scroll and manual toggle
    const isVisible = autoVisible && !manuallyHidden;

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        await performLogoutCleanup();
        navigate('/login');
        handleCloseMenu();
    };

    const handleNavigate = (path: string) => {
        navigate(path);
        handleCloseMenu();
    };

    const toggleManualHide = useCallback(() => {
        setManuallyHidden(prev => !prev);
    }, []);

    const handleShow = useCallback(() => {
        setManuallyHidden(false);
        onShow?.();
    }, [onShow]);

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1100,
                width: 'calc(100% - 32px)',
                maxWidth: 420,
                display: { xs: 'block', lg: 'none' },
                pointerEvents: 'none'
            }}
        >
            <AnimatePresence mode="wait">
                {isVisible ? (
                    <Box
                        key="main-bar"
                        component={motion.div}
                        initial={{ y: 80, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 80, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        sx={{
                            pointerEvents: 'auto',
                            bgcolor: alpha(theme.palette.background.paper, 0.88),
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            borderRadius: '24px',
                            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                            boxShadow: `0 8px 32px -8px ${alpha('#000', 0.6)}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            px: 1,
                            py: 0.5,
                        }}
                    >
                        {/* Compact Nav Items */}
                        <Box sx={{ display: 'flex', flex: 1, justifyContent: 'space-around' }}>
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <IconButton
                                        key={item.name}
                                        component={Link}
                                        to={item.href}
                                        disableTouchRipple
                                        sx={{
                                            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                            bgcolor: 'transparent !important',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            borderRadius: '16px',
                                            p: 0.8,
                                            minWidth: 50,
                                            transition: 'color 0.2s',
                                            '&:hover, &:active, &.Mui-focusVisible': {
                                                bgcolor: 'transparent !important',
                                            }
                                        }}
                                    >
                                        <Icon sx={{ fontSize: 20 }} />
                                        <Typography variant="caption" sx={{ fontSize: '9px', mt: 0.2, fontWeight: isActive ? 700 : 500 }}>
                                            {item.name}
                                        </Typography>
                                    </IconButton>
                                );
                            })}

                            <IconButton
                                onClick={handleOpenMenu}
                                disableTouchRipple
                                sx={{
                                    color: anchorEl ? theme.palette.primary.main : theme.palette.text.secondary,
                                    bgcolor: 'transparent !important',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: '16px',
                                    p: 0.8,
                                    minWidth: 50,
                                    '&:hover, &:active, &.Mui-focusVisible': {
                                        bgcolor: 'transparent !important',
                                    }
                                }}
                            >
                                <MoreIcon sx={{ fontSize: 20 }} />
                                <Typography variant="caption" sx={{ fontSize: '9px', mt: 0.2 }}>More</Typography>
                            </IconButton>
                        </Box>

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1, opacity: 0.3 }} />

                        {/* Manual Hide Button */}
                        <IconButton
                            onClick={toggleManualHide}
                            sx={{
                                color: theme.palette.text.secondary,
                                opacity: 0.6,
                                p: 0.8,
                                '&:hover': { opacity: 1 }
                            }}
                        >
                            <HideIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Box>
                ) : (
                    <Box
                        key="pull-up-handle"
                        component={motion.div}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        onClick={handleShow}
                        sx={{
                            pointerEvents: 'auto',
                            width: 50,
                            height: 32,
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                            backdropFilter: 'blur(12px)',
                            borderRadius: '12px 12px 0 0',
                            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                            borderBottom: 'none',
                            mx: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: `0 -4px 16px -4px ${alpha('#000', 0.4)}`,
                        }}
                    >
                        <ShowIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
                    </Box>
                )}
            </AnimatePresence>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                slotProps={{
                    paper: {
                        sx: {
                            mb: 2,
                            width: 200,
                            borderRadius: '20px',
                            bgcolor: theme.palette.background.paper,
                            backgroundImage: 'none',
                            boxShadow: theme.shadows[20],
                            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                            backdropFilter: 'blur(20px)',
                        }
                    }
                }}
                transformOrigin={{ horizontal: 'center', vertical: 'bottom' }}
                anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
            >
                {overflowItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                        <MenuItem
                            key={item.name}
                            onClick={() => handleNavigate(item.href)}
                            sx={{
                                borderRadius: 1.5,
                                gap: 1.2,
                                py: 1,
                                m: 0.5,
                                color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                                <Icon sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</Typography>
                        </MenuItem>
                    );
                })}
                <Divider sx={{ my: 0.5, opacity: 0.5 }} />
                <MenuItem
                    onClick={handleLogout}
                    sx={{
                        borderRadius: 1.5,
                        gap: 1.2,
                        py: 1,
                        m: 0.5,
                        color: 'error.main',
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                        <LogOutIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '13px' }}>Logout</Typography>
                </MenuItem>
            </Menu>
        </Box>
    );
});

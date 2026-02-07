import { useState, memo } from 'react';
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
    MoreHoriz as MoreIcon
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
    onHide?: () => void;
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

export const MobileBottomBar = memo(({ visible, onHide, onShow }: MobileBottomBarProps) => {
    const theme = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        await performLogoutCleanup();
        navigate('/');
        handleCloseMenu();
    };

    const handleNavigate = (path: string) => {
        navigate(path);
        handleCloseMenu();
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1100,
                width: 'calc(100% - 48px)',
                maxWidth: 400,
                display: { xs: 'block', lg: 'none' },
                pointerEvents: 'none'
            }}
        >
            <AnimatePresence mode="wait">
                {visible ? (
                    <Box
                        key="active-bar"
                        component={motion.div}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 200 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 60) {
                                onHide?.();
                            }
                        }}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                        sx={{
                            pointerEvents: 'auto',
                            bgcolor: alpha(theme.palette.background.paper, 0.8),
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            borderRadius: '100px',
                            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                            boxShadow: `0 8px 32px -4px ${alpha('#000', 0.5)}`,
                            display: 'flex',
                            justifyContent: 'space-around',
                            alignItems: 'center',
                            px: 1,
                            py: 0.5,
                        }}
                    >
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Box
                                    key={item.name}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        flex: 1
                                    }}
                                >
                                    <IconButton
                                        component={Link}
                                        to={item.href}
                                        sx={{
                                            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                            bgcolor: 'transparent',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: 'transparent',
                                                color: theme.palette.primary.main
                                            },
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 0.2,
                                            borderRadius: '100px',
                                            p: 1
                                        }}
                                    >
                                        <Icon sx={{ fontSize: 24 }} />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: '10px',
                                                fontWeight: isActive ? 700 : 500,
                                                letterSpacing: 0.2
                                            }}
                                        >
                                            {item.name}
                                        </Typography>
                                    </IconButton>
                                </Box>
                            );
                        })}

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                flex: 1
                            }}
                        >
                            <IconButton
                                onClick={handleOpenMenu}
                                sx={{
                                    color: Boolean(anchorEl) ? theme.palette.primary.main : theme.palette.text.secondary,
                                    bgcolor: 'transparent',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: 'transparent',
                                        color: theme.palette.primary.main
                                    },
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.2,
                                    borderRadius: '100px',
                                    p: 1
                                }}
                            >
                                <MoreIcon sx={{ fontSize: 24 }} />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '10px',
                                        fontWeight: Boolean(anchorEl) ? 700 : 500,
                                        letterSpacing: 0.2
                                    }}
                                >
                                    More
                                </Typography>
                            </IconButton>
                        </Box>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleCloseMenu}
                            slotProps={{
                                paper: {
                                    sx: {
                                        mb: 2,
                                        width: 220,
                                        p: 1,
                                        borderRadius: '20px',
                                        bgcolor: theme.palette.background.paper,
                                        backgroundImage: 'none',
                                        boxShadow: theme.shadows[20],
                                        border: `1px solid ${alpha(theme.palette.divider, 0.25)}`,
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
                                            borderRadius: 2.5,
                                            gap: 1.5,
                                            py: 1.2,
                                            color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                                            bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                                            <Icon sx={{ fontSize: 20 }} />
                                        </ListItemIcon>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                                    </MenuItem>
                                );
                            })}
                            <Divider sx={{ my: 1, opacity: 0.5 }} />
                            <MenuItem
                                onClick={handleLogout}
                                sx={{
                                    borderRadius: 2.5,
                                    gap: 1.5,
                                    py: 1.2,
                                    color: 'error.main',
                                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                                    <LogOutIcon sx={{ fontSize: 20 }} />
                                </ListItemIcon>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>Logout</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                ) : (
                    <Box
                        key="pull-handle"
                        component={motion.div}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{
                            y: 0,
                            opacity: 1,
                            scale: [1, 1.1, 1],
                        }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{
                            scale: {
                                duration: 2,
                                repeat: Infinity,
                                repeatType: 'reverse'
                            },
                            opacity: { duration: 0.3 },
                            y: { duration: 0.3 }
                        }}
                        onClick={onShow}
                        sx={{
                            pointerEvents: 'auto',
                            width: 60,
                            height: 6,
                            bgcolor: alpha(theme.palette.primary.main, 0.4),
                            borderRadius: '100px',
                            mx: 'auto',
                            cursor: 'pointer',
                            boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.6),
                            },
                            // Add a touch target area
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: -20,
                                left: -20,
                                right: -20,
                                bottom: -20,
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </Box>
    );
});

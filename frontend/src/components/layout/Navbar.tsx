import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
    Menu as MenuIcon,
    Close as XIcon,
    Palette as PaletteIcon,
    Lock as LockIcon,
    Person as PersonIcon,
    Email as EmailIcon,
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    InputAdornment,
    Link,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Tooltip,
    Divider,
    Stack
} from '@mui/material';
import { AegisLogo } from '@/components/AegisLogo';
import authService from '@/services/authService';
import tokenService from '@/services/tokenService';
import { useSessionStore } from '@/stores/sessionStore';
import { useThemeStore } from '@/stores/themeStore';

export function Navbar() {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, setUser, clearSession } = useSessionStore();
    const { theme: currentTheme, toggleTheme } = useThemeStore();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            if (!user && tokenService.hasValidToken()) {
                try {
                    const validatedUser = await authService.validateSession();
                    if (validatedUser) {
                        setUser(validatedUser);
                    }
                } catch {
                    // Token invalid
                }
            }
        };
        checkSession();
    }, [user, setUser]);

    // Check if we should show login dialog from redirect
    useEffect(() => {
        if (location.state?.showLogin) {
            setIsLoginOpen(true);
        }
    }, [location.state]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegisterMode) {
                const response = await authService.register(username, email, password);
                setUser({ _id: response._id, email: response.email, username: response.username });
                setIsLoginOpen(false);
                resetForm();
                navigate('/dashboard');
            } else {
                const response = await authService.login(email, password);
                setUser({ _id: response._id, email: response.email, username: response.username });
                setIsLoginOpen(false);
                resetForm();
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setUsername('');
        setPassword('');
        setError('');
    };

    const handleLogout = async () => {
        await authService.logout();
        clearSession();
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setError('');
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
                    bgcolor: alpha(theme.palette.background.paper, 0.1),
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: 'none',
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
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
                            {['Features', 'Security'].map((item) => (
                                <Button
                                    key={item}
                                    component="a"
                                    href={`#${item.toLowerCase()}`}
                                    sx={{
                                        color: 'text.secondary',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                                    }}
                                >
                                    {item}
                                </Button>
                            ))}
                            {!user && (
                                <Button
                                    onClick={() => setIsLoginOpen(true)}
                                    sx={{
                                        color: 'text.secondary',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                                    }}
                                >
                                    Login
                                </Button>
                            )}

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
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
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
                                <Button
                                    variant="contained"
                                    onClick={() => setIsLoginOpen(true)}
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
                        bgcolor: alpha(theme.palette.background.default, 0.95),
                        backdropFilter: 'blur(20px)',
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
                    {['Features', 'Security'].map((item) => (
                        <ListItem key={item} disablePadding>
                            <ListItemButton
                                component="a"
                                href={`#${item.toLowerCase()}`}
                                onClick={() => setMobileOpen(false)}
                                sx={{ borderRadius: 2 }}
                            >
                                <ListItemText primary={item} primaryTypographyProps={{ fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                    <ListItem disablePadding>
                        <ListItemButton onClick={toggleTheme} sx={{ borderRadius: 2 }}>
                            <ListItemText
                                primary="Switch Theme"
                                secondary={currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}
                                primaryTypographyProps={{ fontWeight: 600 }}
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
                            setIsLoginOpen(true);
                            setMobileOpen(false);
                        }}
                        sx={{ py: 1.5, fontWeight: 700 }}
                    >
                        Login / Register
                    </Button>
                )}
            </Drawer>

            {/* Login / Register Dialog */}
            <Dialog
                open={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        width: '100%',
                        maxWidth: 420,
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(32px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: theme.shadows[24],
                        backgroundImage: 'none'
                    }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1, fontWeight: 900, letterSpacing: -0.5 }}>
                    {isRegisterMode ? 'Create Your Vault' : 'Access Your Vault'}
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 1, px: 2 }}>
                        {isRegisterMode
                            ? 'Generate a new PQC identity. Your keys never leave this device.'
                            : 'Enter your credentials to verify identity via Zero-Knowledge Proof.'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 4, pb: 2 }}>
                    <Stack spacing={2.5} sx={{ mt: 2 }}>
                        {isRegisterMode && (
                            <TextField
                                fullWidth
                                label="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment>,
                                }}
                            />
                        )}
                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment>,
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Encryption Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" /></InputAdornment>,
                            }}
                        />
                        {error && (
                            <Typography variant="caption" sx={{ color: 'error.main', textAlign: 'center', fontWeight: 600 }}>
                                {error}
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ flexDirection: 'column', gap: 1.5, px: 4, pb: 4 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        onClick={handleAuth}
                        sx={{ py: 1.5, fontWeight: 700, borderRadius: 2.5 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : (isRegisterMode ? 'Generate Keys & Register' : 'Authenticate')}
                    </Button>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {isRegisterMode ? 'Already have a vault?' : 'Need a secure vault?'}
                        <Link
                            component="button"
                            onClick={toggleMode}
                            sx={{ ml: 1, fontWeight: 700, textDecoration: 'none', color: 'primary.main' }}
                        >
                            {isRegisterMode ? 'Login here' : 'Register here'}
                        </Link>
                    </Typography>
                </DialogActions>
            </Dialog>
        </>
    );
}

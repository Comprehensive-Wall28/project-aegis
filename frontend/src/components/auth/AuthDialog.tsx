import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    TextField,
    CircularProgress,
    InputAdornment,
    Link,
    Stack,
    alpha,
    useTheme,
    Paper
} from '@mui/material';
import {
    Close as XIcon,
    Lock as LockIcon,
    Person as PersonIcon,
    Email as EmailIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '@/services/authService';
import { useSessionStore } from '@/stores/sessionStore';
import { storeSeed } from '@/lib/cryptoUtils';
import { useNavigate } from 'react-router-dom';

interface AuthDialogProps {
    open: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

export function AuthDialog({ open, onClose, initialMode = 'login' }: AuthDialogProps) {
    const theme = useTheme();
    const navigate = useNavigate();
    const { setUser, initializeQuantumKeys } = useSessionStore();

    // Form State
    const [isRegisterMode, setIsRegisterMode] = useState(initialMode === 'register');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setIsRegisterMode(initialMode === 'register');
            resetForm();
        }
    }, [open, initialMode]);

    const resetForm = () => {
        setEmail('');
        setUsername('');
        setPassword('');
        setError('');
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegisterMode) {
                const response = await authService.register(username, email, password);
                if (response.pqcSeed) {
                    storeSeed(response.pqcSeed);
                    initializeQuantumKeys(response.pqcSeed);
                }
                setUser({ _id: response._id, email: response.email, username: response.username });
                onClose();
                navigate('/dashboard');
            } else {
                const response = await authService.login(email, password);
                if (response.pqcSeed) {
                    storeSeed(response.pqcSeed);
                    initializeQuantumKeys(response.pqcSeed);
                }
                setUser({ _id: response._id, email: response.email, username: response.username });
                onClose();
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
                onClose();
                navigate('/backend-down');
                return;
            }
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setError('');
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(8px)',
                            zIndex: theme.zIndex.modal
                        }}
                    />

                    {/* Modal Container */}
                    <Box
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: theme.zIndex.modal + 1,
                            pointerEvents: 'none'
                        }}
                    >
                        {/* Animated Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                            style={{ pointerEvents: 'auto', width: '100%', maxWidth: '420px', padding: '16px' }}
                        >
                            <Paper
                                component={motion.div}
                                layout // Enables smooth height resizing
                                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                sx={{
                                    borderRadius: 4,
                                    bgcolor: theme.palette.background.paper,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    boxShadow: theme.shadows[24],
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                            >
                                {/* Close Button */}
                                <IconButton
                                    onClick={onClose}
                                    size="small"
                                    sx={{
                                        position: 'absolute',
                                        right: 16,
                                        top: 16,
                                        color: 'text.secondary',
                                        zIndex: 10
                                    }}
                                >
                                    <XIcon fontSize="small" />
                                </IconButton>

                                <Box sx={{ p: 4 }}>
                                    {/* Header */}
                                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                                        <Typography
                                            component={motion.h2}
                                            layout="position"
                                            variant="h5"
                                            sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 1 }}
                                        >
                                            {isRegisterMode ? 'Create Your Vault' : 'Access Your Vault'}
                                        </Typography>
                                        <Typography
                                            component={motion.p}
                                            layout="position"
                                            variant="body2"
                                            sx={{ color: 'text.secondary', fontWeight: 500, px: 2, lineHeight: 1.5 }}
                                        >
                                            {isRegisterMode
                                                ? 'Generate a new PQC identity. Your keys never leave this device.'
                                                : 'Enter your credentials to verify identity via Zero-Knowledge Proof.'}
                                        </Typography>
                                    </Box>

                                    {/* Form */}
                                    <Stack spacing={2.5} component="form" onSubmit={handleAuth}>
                                        <AnimatePresence mode="popLayout">
                                            {isRegisterMode && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <TextField
                                                        fullWidth
                                                        label="Username"
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value)}
                                                        InputProps={{
                                                            startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment>,
                                                        }}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

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
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <Typography variant="caption" sx={{ color: 'error.main', display: 'block', textAlign: 'center', fontWeight: 600 }}>
                                                    {error}
                                                </Typography>
                                            </motion.div>
                                        )}

                                        <Button
                                            fullWidth
                                            variant="contained"
                                            disabled={loading}
                                            type="submit"
                                            sx={{ py: 1.5, fontWeight: 700, borderRadius: 2.5, mt: 1 }}
                                        >
                                            {loading ? <CircularProgress size={24} color="inherit" /> : (isRegisterMode ? 'Generate Keys & Register' : 'Authenticate')}
                                        </Button>

                                        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}>
                                            {isRegisterMode ? 'Already have a vault?' : 'Need a secure vault?'}
                                            <Link
                                                component="button"
                                                type="button"
                                                onClick={toggleMode}
                                                sx={{ ml: 1, fontWeight: 700, textDecoration: 'none', color: 'primary.main' }}
                                            >
                                                {isRegisterMode ? 'Login here' : 'Register here'}
                                            </Link>
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Paper>
                        </motion.div>
                    </Box>
                </>
            )}
        </AnimatePresence>
    );
}

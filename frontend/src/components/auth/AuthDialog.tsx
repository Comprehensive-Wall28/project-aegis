import { useState, useEffect, useRef } from 'react';
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
    Fingerprint as FingerprintIcon,
} from '@mui/icons-material';
import { startAuthentication } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '@/services/authService';
import { useSessionStore } from '@/stores/sessionStore';
import { storeSeed, derivePQCSeed } from '@/lib/cryptoUtils';
import { useNavigate } from 'react-router-dom';
import apiClient, { refreshCsrfToken } from '@/services/api';

interface AuthResponse {
    _id: string;
    email: string;
    username: string;
    pqcSeed?: string;
    status?: string;
    options?: any;
    message?: string;
}

interface AuthDialogProps {
    open: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

const MotionPaper = motion.create(Paper);

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
    const [success, setSuccess] = useState('');
    const [show2FA, setShow2FA] = useState(false);
    const [authOptions, setAuthOptions] = useState<any>(null);

    // Track open count to force fresh state on each open
    const [openCount, setOpenCount] = useState(0);
    const prevOpenRef = useRef(false);

    // Sync mode with initialMode when dialog opens
    useEffect(() => {
        if (open && !prevOpenRef.current) {
            // Dialog just opened - reset everything and increment count
            setIsRegisterMode(initialMode === 'register');
            resetForm();
            setOpenCount(c => c + 1);
        }
        prevOpenRef.current = open;
    }, [open, initialMode]);

    const resetForm = () => {
        setEmail('');
        setUsername('');
        setPassword('');
        setError('');
        setSuccess('');
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegisterMode) {
                await authService.register(username, email, password);

                // Instead of logging in, show success and switch to login
                setSuccess('Vault created successfully! Please login to continue.');
                setIsRegisterMode(false);
                setPassword(''); // Clear password for security
                // Keep email and username for convenience if they match login fields
            } else {
                const response = await authService.login(email, password);

                if (response.status === '2FA_REQUIRED') {
                    setAuthOptions(response.options);
                    setShow2FA(true);
                    setLoading(false);
                    // Automatically trigger passkey auth after a short delay for UX
                    setTimeout(() => handleComplete2FA(response.options), 500);
                    return;
                }

                // Set user first so initializeQuantumKeys can attach keys to it
                setUser({ _id: response._id, email: response.email, username: response.username });
                if (response.pqcSeed) {
                    storeSeed(response.pqcSeed);
                    initializeQuantumKeys(response.pqcSeed);
                }
                // Refresh CSRF token after login to prevent 403 errors
                await refreshCsrfToken();
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
        setSuccess('');
    };

    const handleComplete2FA = async (options = authOptions) => {
        if (!options) return;
        setLoading(true);
        setError('');

        try {
            const credential = await startAuthentication({ optionsJSON: options });

            const finalResponse = await apiClient.post<AuthResponse>('/auth/webauthn/login-verify', {
                email,
                body: credential
            });

            const data = finalResponse.data;
            const pqcSeed = await derivePQCSeed(password);

            if (data._id) {
                // Set user first so initializeQuantumKeys can attach keys to it
                setUser({ _id: data._id, email: data.email, username: data.username });
                storeSeed(pqcSeed);
                initializeQuantumKeys(pqcSeed);
                // Refresh CSRF token after 2FA login to prevent 403 errors
                await refreshCsrfToken();
                onClose();
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Passkey 2FA failed');
            setShow2FA(false); // Go back to login form on failure
        } finally {
            setLoading(false);
        }
    };

    // Animation variants
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 30 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                damping: 25,
                stiffness: 300
            }
        },
        exit: {
            opacity: 0,
            scale: 0.9,
            y: 30,
            transition: {
                duration: 0.2
            }
        }
    };

    const fieldVariants = {
        hidden: {
            opacity: 0,
            y: -10
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.2,
                ease: "easeOut" as const
            }
        },
        exit: {
            opacity: 0,
            y: -10,
            transition: {
                duration: 0.15,
                ease: "easeIn" as const
            }
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
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
                            pointerEvents: 'none',
                            p: 2
                        }}
                    >
                        {/* Animated Card */}
                        <MotionPaper
                            key="modal"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                pointerEvents: 'auto',
                                width: '100%',
                                maxWidth: 420,
                                borderRadius: 4,
                                bgcolor: theme.palette.background.paper,
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5)`,
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
                                    zIndex: 10,
                                    '&:hover': {
                                        color: 'text.primary',
                                        bgcolor: alpha(theme.palette.action.hover, 0.1)
                                    }
                                }}
                            >
                                <XIcon fontSize="small" />
                            </IconButton>

                            <Box sx={{ p: 4 }}>
                                {/* Header */}
                                <Box sx={{ textAlign: 'center', mb: 3 }}>
                                    <Typography
                                        variant="h5"
                                        sx={{ fontWeight: 900, letterSpacing: -0.5, mb: 1 }}
                                    >
                                        {isRegisterMode ? 'Create Your Vault' : 'Access Your Vault'}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary', fontWeight: 500, px: 2, lineHeight: 1.5 }}
                                    >
                                        {isRegisterMode
                                            ? 'Generate a new PQC identity. Your keys never leave this device.'
                                            : 'Enter your credentials to verify identity via Zero-Knowledge Proof.'}
                                    </Typography>
                                </Box>

                                {/* Form */}
                                <Stack component="form" onSubmit={handleAuth} sx={{ gap: 2.5 }}>
                                    {show2FA ? (
                                        <Box sx={{ textAlign: 'center', py: 2 }}>
                                            <FingerprintIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                                Two-Factor Authentication
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                                                Please use your registered passkey to complete the login.
                                            </Typography>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                onClick={() => handleComplete2FA()}
                                                disabled={loading}
                                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FingerprintIcon />}
                                                sx={{ py: 1.5, borderRadius: 2.5 }}
                                            >
                                                {loading ? 'Verifying...' : 'Tap Passkey'}
                                            </Button>
                                            <Button
                                                variant="text"
                                                onClick={() => setShow2FA(false)}
                                                sx={{ mt: 2, color: 'text.secondary' }}
                                            >
                                                Cancel
                                            </Button>
                                        </Box>
                                    ) : (
                                        <>
                                            <AnimatePresence initial={false} mode="sync" key={`form-animations-${openCount}`}>
                                                {isRegisterMode && (
                                                    <motion.div
                                                        key="username-field"
                                                        variants={fieldVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="exit"
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

                                            <AnimatePresence mode="wait">
                                                {error && (
                                                    <motion.div
                                                        key="error-message"
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', textAlign: 'center', fontWeight: 600 }}>
                                                            {error}
                                                        </Typography>
                                                    </motion.div>
                                                )}
                                                {success && (
                                                    <motion.div
                                                        key="success-message"
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                py: 1,
                                                                px: 2,
                                                                borderRadius: 2,
                                                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                                                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                                                textAlign: 'center'
                                                            }}
                                                        >
                                                            <Typography variant="caption" sx={{ color: 'success.main', display: 'block', fontWeight: 700 }}>
                                                                {success}
                                                            </Typography>
                                                        </Box>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <Button
                                                fullWidth
                                                variant="contained"
                                                disabled={loading}
                                                type="submit"
                                                sx={{
                                                    py: 1.5,
                                                    fontWeight: 700,
                                                    borderRadius: 2.5,
                                                    mt: 1,
                                                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                                                    '&:hover': {
                                                        boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`
                                                    }
                                                }}
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
                                        </>
                                    )}
                                </Stack>
                            </Box>
                        </MotionPaper>
                    </Box>
                </>
            )}
        </AnimatePresence>
    );
}

import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    alpha,
    useTheme,
    CircularProgress,
    Snackbar,
    Alert,
    IconButton,
    Tooltip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    ToggleButtonGroup,
    ToggleButton,
    Collapse,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    Key as KeyIcon,
    Timer as TimerIcon,
    Security as SecurityIcon,
    Shield as ShieldIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSessionStore, type UserPreferences } from '@/stores/sessionStore';
import authService from '@/services/authService';

interface FormErrors {
    username?: string;
    email?: string;
}

interface NotificationState {
    type: 'success' | 'error';
    message: string;
}

const SESSION_TIMEOUT_OPTIONS = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
];

const ENCRYPTION_LEVELS = [
    { value: 'STANDARD', label: 'Standard', description: 'Default ML-KEM-768 encryption' },
    { value: 'HIGH', label: 'High', description: 'Enhanced key derivation' },
    { value: 'PARANOID', label: 'Paranoid', description: 'Maximum security settings' },
];

export function SettingsPage() {
    const theme = useTheme();
    const user = useSessionStore((state) => state.user);
    const updateUser = useSessionStore((state) => state.updateUser);

    // Account form state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [hasAccountChanges, setHasAccountChanges] = useState(false);

    // Security preferences state
    const [sessionTimeout, setSessionTimeout] = useState(60);
    const [encryptionLevel, setEncryptionLevel] = useState<'STANDARD' | 'HIGH' | 'PARANOID'>('STANDARD');
    const [hasPreferencesChanges, setHasPreferencesChanges] = useState(false);
    const [isPreferencesLoading, setIsPreferencesLoading] = useState(false);

    // Copy state
    const [copied, setCopied] = useState(false);

    // PQC Key visibility state
    const [showPqcKey, setShowPqcKey] = useState(false);

    // Initialize form with current user data
    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
            if (user.preferences) {
                setSessionTimeout(user.preferences.sessionTimeout);
                setEncryptionLevel(user.preferences.encryptionLevel);
            }
        }
    }, [user]);

    // Check for account changes
    useEffect(() => {
        if (user) {
            setHasAccountChanges(username !== user.username || email !== user.email);
        }
    }, [username, email, user]);

    // Check for preferences changes
    useEffect(() => {
        if (user?.preferences) {
            setHasPreferencesChanges(
                sessionTimeout !== user.preferences.sessionTimeout ||
                encryptionLevel !== user.preferences.encryptionLevel
            );
        }
    }, [sessionTimeout, encryptionLevel, user]);

    // Validation functions
    const validateUsername = (value: string): string | undefined => {
        if (value.trim().length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Username can only contain letters, numbers, underscores, and hyphens';
        return undefined;
    };

    const validateEmail = (value: string): string | undefined => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return undefined;
    };

    const handleUsernameChange = (value: string) => {
        setUsername(value);
        setErrors((prev) => ({ ...prev, username: validateUsername(value) }));
    };

    const handleEmailChange = (value: string) => {
        setEmail(value);
        setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    };

    const handleAccountSubmit = async () => {
        const usernameError = validateUsername(username);
        const emailError = validateEmail(email);

        if (usernameError || emailError) {
            setErrors({ username: usernameError, email: emailError });
            return;
        }

        setIsLoading(true);
        setNotification(null);

        try {
            const updateData: { username?: string; email?: string } = {};
            if (username !== user?.username) updateData.username = username;
            if (email !== user?.email) updateData.email = email;

            const updatedUser = await authService.updateProfile(updateData);
            updateUser({ username: updatedUser.username, email: updatedUser.email });
            setNotification({ type: 'success', message: 'Profile updated successfully!' });
            setHasAccountChanges(false);
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to update profile.';
            setNotification({ type: 'error', message });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreferencesSubmit = async () => {
        setIsPreferencesLoading(true);
        setNotification(null);

        try {
            const preferences: Partial<UserPreferences> = {
                sessionTimeout,
                encryptionLevel,
            };

            const updatedUser = await authService.updateProfile({ preferences });
            updateUser({ preferences: updatedUser.preferences } as any);
            setNotification({ type: 'success', message: 'Security preferences saved!' });
            setHasPreferencesChanges(false);
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to save preferences.';
            setNotification({ type: 'error', message });
        } finally {
            setIsPreferencesLoading(false);
        }
    };

    const handleCopyPublicKey = async () => {
        if (user?.publicKey) {
            await navigator.clipboard.writeText(user.publicKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCloseNotification = () => setNotification(null);

    const sharedPaperStyles = {
        p: 4,
        borderRadius: '16px',
        bgcolor: alpha(theme.palette.background.paper, 0.4),
        backdropFilter: 'blur(12px)',
        border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
    };

    // Truncate public key for display
    const truncatedKey = user?.publicKey
        ? `${user.publicKey.slice(0, 32)}...${user.publicKey.slice(-32)}`
        : 'Key not available';

    return (
        <Box
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 3 } }}
        >
            {/* Page Header */}
            <Box component={motion.div} variants={itemVariants} sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <SettingsIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                    Account Settings
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Manage your profile and security preferences
                </Typography>
            </Box>

            {/* Snackbar Notification */}
            <Snackbar
                open={!!notification}
                autoHideDuration={5000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseNotification} severity={notification?.type || 'success'} variant="filled" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                    {notification?.message}
                </Alert>
            </Snackbar>

            {/* Account Information */}
            <Paper component={motion.div} variants={itemVariants} sx={{ ...sharedPaperStyles, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.1em', fontSize: '10px', mb: 3 }}>
                    ACCOUNT INFORMATION
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        label="Username"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        error={!!errors.username}
                        helperText={errors.username}
                        fullWidth
                        variant="outlined"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: alpha(theme.palette.common.white, 0.03) } }}
                    />
                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        error={!!errors.email}
                        helperText={errors.email}
                        fullWidth
                        variant="outlined"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: alpha(theme.palette.common.white, 0.03) } }}
                    />
                </Box>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={handleAccountSubmit}
                        disabled={isLoading || !hasAccountChanges || !!errors.username || !!errors.email}
                        disableElevation
                        sx={{
                            borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '14px',
                            px: 4, py: 1.5, bgcolor: theme.palette.primary.main, color: '#000', minWidth: 150,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.9) },
                            '&:disabled': { bgcolor: alpha(theme.palette.primary.main, 0.3), color: alpha('#000', 0.5) },
                        }}
                    >
                        {isLoading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Save Changes'}
                    </Button>
                </Box>
            </Paper>

            {/* Security Preferences */}
            <Paper component={motion.div} variants={itemVariants} sx={{ ...sharedPaperStyles, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.1em', fontSize: '10px', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon sx={{ fontSize: 14 }} />
                    SECURITY PREFERENCES
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Session Timeout */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <TimerIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Session Timeout</Typography>
                        </Box>
                        <FormControl fullWidth>
                            <InputLabel id="session-timeout-label">Auto-logout after</InputLabel>
                            <Select
                                labelId="session-timeout-label"
                                value={sessionTimeout}
                                label="Auto-logout after"
                                onChange={(e) => setSessionTimeout(e.target.value as number)}
                                sx={{ borderRadius: '12px', bgcolor: alpha(theme.palette.common.white, 0.03) }}
                            >
                                {SESSION_TIMEOUT_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Encryption Level */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <ShieldIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Encryption Level</Typography>
                        </Box>
                        <ToggleButtonGroup
                            value={encryptionLevel}
                            exclusive
                            onChange={(_, value) => value && setEncryptionLevel(value)}
                            fullWidth
                            sx={{ bgcolor: alpha(theme.palette.common.white, 0.02), borderRadius: '12px', p: 0.5 }}
                        >
                            {ENCRYPTION_LEVELS.map((level) => (
                                <ToggleButton
                                    key={level.value}
                                    value={level.value}
                                    sx={{
                                        flex: 1, py: 1.5, borderRadius: '10px !important', border: 'none', textTransform: 'none',
                                        '&.Mui-selected': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                                            color: theme.palette.primary.main,
                                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                                        },
                                    }}
                                >
                                    <Tooltip title={level.description}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{level.label}</Typography>
                                    </Tooltip>
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block', opacity: 0.7 }}>
                            {ENCRYPTION_LEVELS.find(l => l.value === encryptionLevel)?.description}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={handlePreferencesSubmit}
                        disabled={isPreferencesLoading || !hasPreferencesChanges}
                        disableElevation
                        sx={{
                            borderRadius: '12px', textTransform: 'none', fontWeight: 700, fontSize: '14px',
                            px: 4, py: 1.5, bgcolor: theme.palette.primary.main, color: '#000', minWidth: 150,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.9) },
                            '&:disabled': { bgcolor: alpha(theme.palette.primary.main, 0.3), color: alpha('#000', 0.5) },
                        }}
                    >
                        {isPreferencesLoading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Save Preferences'}
                    </Button>
                </Box>
            </Paper>

            {/* PQC Identity - Collapsible at the end */}
            <Paper component={motion.div} variants={itemVariants} sx={{ ...sharedPaperStyles, mt: 3 }}>
                <Box
                    onClick={() => setShowPqcKey(!showPqcKey)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.1em', fontSize: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KeyIcon sx={{ fontSize: 14 }} />
                        PQC IDENTITY
                    </Typography>
                    <IconButton size="small" sx={{ color: 'text.secondary' }}>
                        {showPqcKey ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Box>

                <Collapse in={showPqcKey}>
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                            ML-KEM-768 Public Key
                        </Typography>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: alpha(theme.palette.common.white, 0.03),
                                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.75rem',
                                    color: user?.publicKey ? 'text.primary' : 'text.secondary',
                                    letterSpacing: '0.02em',
                                    wordBreak: 'break-all',
                                    flex: 1,
                                }}
                            >
                                {truncatedKey}
                            </Typography>
                            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                                <IconButton
                                    onClick={handleCopyPublicKey}
                                    disabled={!user?.publicKey}
                                    sx={{
                                        bgcolor: copied ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.primary.main, 0.1),
                                        color: copied ? theme.palette.success.main : theme.palette.primary.main,
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                                    }}
                                >
                                    {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block', opacity: 0.7 }}>
                            Your quantum-resistant public key for secure key encapsulation
                        </Typography>

                        <Button
                            variant="outlined"
                            disabled
                            startIcon={<ShieldIcon />}
                            sx={{
                                mt: 2,
                                borderRadius: '12px', textTransform: 'none', fontWeight: 600, fontSize: '13px',
                                borderColor: alpha(theme.palette.common.white, 0.1),
                                color: 'text.secondary',
                                '&:disabled': { borderColor: alpha(theme.palette.common.white, 0.05), color: alpha(theme.palette.text.secondary, 0.5) },
                            }}
                        >
                            Key Rotation (Coming Soon)
                        </Button>
                    </Box>
                </Collapse>
            </Paper>
        </Box>
    );
}

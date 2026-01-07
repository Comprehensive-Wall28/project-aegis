import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    alpha,
    useTheme,
    CircularProgress,
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
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    Key as KeyIcon,
    Timer as TimerIcon,
    Security as SecurityIcon,
    Shield as ShieldIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useSessionStore, type UserPreferences } from '@/stores/sessionStore';
import authService from '@/services/authService';

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

interface SecuritySettingsProps {
    onNotification: (type: 'success' | 'error', message: string) => void;
}

export function SecuritySettings({ onNotification }: SecuritySettingsProps) {
    const theme = useTheme();
    const user = useSessionStore((state) => state.user);
    const updateUser = useSessionStore((state) => state.updateUser);

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
        if (user?.preferences) {
            setSessionTimeout(user.preferences.sessionTimeout);
            setEncryptionLevel(user.preferences.encryptionLevel);
        }
    }, [user]);

    // Check for preferences changes
    useEffect(() => {
        if (user?.preferences) {
            setHasPreferencesChanges(
                sessionTimeout !== user.preferences.sessionTimeout ||
                encryptionLevel !== user.preferences.encryptionLevel
            );
        }
    }, [sessionTimeout, encryptionLevel, user]);

    const handlePreferencesSubmit = async () => {
        setIsPreferencesLoading(true);

        try {
            const preferences: Partial<UserPreferences> = {
                sessionTimeout,
                encryptionLevel,
            };

            const updatedUser = await authService.updateProfile({ preferences });
            updateUser({ preferences: updatedUser.preferences } as any);
            onNotification('success', 'Security preferences saved!');
            setHasPreferencesChanges(false);
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to save preferences.';
            onNotification('error', message);
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

    const sharedPaperStyles = {
        p: 4,
        borderRadius: '16px',
        bgcolor: alpha(theme.palette.background.paper, 0.4),
        backdropFilter: 'blur(12px)',
        border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
    };

    // Truncate public key for display
    const truncatedKey = user?.publicKey
        ? `${user.publicKey.slice(0, 32)}...${user.publicKey.slice(-32)}`
        : 'Key not available';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Security Preferences */}
            <Paper sx={sharedPaperStyles}>
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

            {/* PQC Identity - Collapsible */}
            <Paper sx={sharedPaperStyles}>
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

export default SecuritySettings;

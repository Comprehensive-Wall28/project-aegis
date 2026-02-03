import { useState, useCallback } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    alpha,
    useTheme,
    InputAdornment,
    IconButton,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Assessment as AssessmentIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { verifyAnalyticsAccess } from '@/services/analyticsService';

interface PasswordGateDialogProps {
    onAccessGranted: (password: string) => void;
}

export const PasswordGateDialog = ({ onAccessGranted }: PasswordGateDialogProps) => {
    const theme = useTheme();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password.trim()) {
            setError('Please enter a password');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const isValid = await verifyAnalyticsAccess(password);

            if (isValid) {
                onAccessGranted(password);
            } else {
                setError('Invalid password. Please try again.');
            }
        } catch (err) {
            setError('Failed to verify password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [password, onAccessGranted]);

    const toggleShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
            }}
        >
            <Paper
                variant="glass"
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                sx={{
                    p: { xs: 3, sm: 4, md: 5 },
                    maxWidth: 480,
                    width: '100%',
                    borderRadius: '24px',
                }}
            >
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2,
                        }}
                    >
                        <AssessmentIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Analytics Access
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Please enter the analytics password to view this page
                    </Typography>
                </Box>

                {error && (
                    <Alert
                        severity="error"
                        sx={{
                            mb: 3,
                            borderRadius: '12px',
                        }}
                    >
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        type={showPassword ? 'text' : 'password'}
                        label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={toggleShowPassword}
                                        edge="end"
                                        size="small"
                                    >
                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                            },
                        }}
                    />

                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={isLoading}
                        sx={{
                            py: 1.5,
                            borderRadius: '12px',
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: '1rem',
                        }}
                    >
                        {isLoading ? 'Verifying...' : 'Access Analytics'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

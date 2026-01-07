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
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/stores/sessionStore';
import authService from '@/services/authService';

interface FormErrors {
    username?: string;
    email?: string;
}

interface NotificationState {
    type: 'success' | 'error';
    message: string;
}

export function SettingsPage() {
    const theme = useTheme();
    const user = useSessionStore((state) => state.user);
    const updateUser = useSessionStore((state) => state.updateUser);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize form with current user data
    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
        }
    }, [user]);

    // Check for changes
    useEffect(() => {
        if (user) {
            setHasChanges(username !== user.username || email !== user.email);
        }
    }, [username, email, user]);

    // Real-time validation
    const validateUsername = (value: string): string | undefined => {
        if (value.trim().length < 3) {
            return 'Username must be at least 3 characters';
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            return 'Username can only contain letters, numbers, underscores, and hyphens';
        }
        return undefined;
    };

    const validateEmail = (value: string): string | undefined => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
        }
        return undefined;
    };

    const handleUsernameChange = (value: string) => {
        setUsername(value);
        const error = validateUsername(value);
        setErrors((prev) => ({ ...prev, username: error }));
    };

    const handleEmailChange = (value: string) => {
        setEmail(value);
        const error = validateEmail(value);
        setErrors((prev) => ({ ...prev, email: error }));
    };

    const handleSubmit = async () => {
        // Validate all fields
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

            // Update local state
            updateUser({
                username: updatedUser.username,
                email: updatedUser.email,
            });

            setNotification({ type: 'success', message: 'Profile updated successfully!' });
            setHasChanges(false);
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to update profile. Please try again.';
            setNotification({ type: 'error', message });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle snackbar close
    const handleCloseNotification = () => {
        setNotification(null);
    };

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
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
            },
        },
    };

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
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 1,
                    }}
                >
                    <SettingsIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                    Account Settings
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Manage your personal information
                </Typography>
            </Box>

            {/* Snackbar Notification */}
            <Snackbar
                open={!!notification}
                autoHideDuration={5000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification?.type || 'success'}
                    variant="filled"
                    sx={{
                        borderRadius: '12px',
                        fontWeight: 600,
                    }}
                >
                    {notification?.message}
                </Alert>
            </Snackbar>

            {/* Account Information */}
            <Paper component={motion.div} variants={itemVariants} sx={sharedPaperStyles}>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 700,
                        color: 'text.secondary',
                        letterSpacing: '0.1em',
                        fontSize: '10px',
                        mb: 3,
                    }}
                >
                    ACCOUNT INFORMATION
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Username */}
                    <TextField
                        label="Username"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        error={!!errors.username}
                        helperText={errors.username}
                        fullWidth
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                bgcolor: alpha(theme.palette.common.white, 0.03),
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.common.white, 0.05),
                                },
                                '&.Mui-focused': {
                                    bgcolor: alpha(theme.palette.common.white, 0.05),
                                },
                            },
                        }}
                    />

                    {/* Email */}
                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        error={!!errors.email}
                        helperText={errors.email}
                        fullWidth
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                bgcolor: alpha(theme.palette.common.white, 0.03),
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.common.white, 0.05),
                                },
                                '&.Mui-focused': {
                                    bgcolor: alpha(theme.palette.common.white, 0.05),
                                },
                            },
                        }}
                    />
                </Box>

                {/* Save Button */}
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isLoading || !hasChanges || !!errors.username || !!errors.email}
                        disableElevation
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '14px',
                            px: 4,
                            py: 1.5,
                            bgcolor: theme.palette.primary.main,
                            color: '#000',
                            minWidth: 150,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.9),
                                transform: 'translateY(-1px)',
                            },
                            '&:active': { transform: 'translateY(0)' },
                            '&:disabled': {
                                bgcolor: alpha(theme.palette.primary.main, 0.3),
                                color: alpha('#000', 0.5),
                            },
                            transition: 'all 0.2s',
                        }}
                    >
                        {isLoading ? (
                            <CircularProgress size={20} sx={{ color: '#000' }} />
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

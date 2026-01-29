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
} from '@mui/material';
import { AxiosError } from 'axios';
import { useSessionStore } from '@/stores/sessionStore';
import authService from '@/services/authService';

interface FormErrors {
    username?: string;
    email?: string;
}

interface AccountSettingsProps {
    onNotification: (type: 'success' | 'error', message: string) => void;
}

export function AccountSettings({ onNotification }: AccountSettingsProps) {
    const theme = useTheme();
    const user = useSessionStore((state) => state.user);
    const updateUser = useSessionStore((state) => state.updateUser);

    // Account form state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [hasAccountChanges, setHasAccountChanges] = useState(false);

    // Initialize form with current user data
    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
        }
    }, [user]);

    // Check for account changes
    useEffect(() => {
        if (user) {
            setHasAccountChanges(username !== user.username || email !== user.email);
        }
    }, [username, email, user]);

    // Validation functions
    const validateUsername = (value: string): string | undefined => {
        if (value.trim().length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Username can only contain letters, numbers, underscores, and hyphens';
        return undefined;
    };

    const validateEmail = (value: string): string | undefined => {
        if (value.length > 254) return 'Email address is too long';
        const emailRegex = /^[^\s@]+@[^@\s.]+(\.[^@\s.]+)+$/;
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

        try {
            const updateData: { username?: string; email?: string } = {};
            if (username !== user?.username) updateData.username = username;
            if (email !== user?.email) updateData.email = email;

            const updatedUser = await authService.updateProfile(updateData);
            updateUser({ username: updatedUser.username, email: updatedUser.email });
            onNotification('success', 'Profile updated successfully!');
            setHasAccountChanges(false);
        } catch (error: AxiosError<{ message: string }> | unknown) {
            const message = (error as AxiosError<{ message: string }>)?.response?.data?.message || 'Failed to update profile.';
            onNotification('error', message);
        } finally {
            setIsLoading(false);
        }
    };

    const sharedPaperStyles = {
        p: { xs: 2, sm: 4 },
        borderRadius: '16px',
        bgcolor: alpha(theme.palette.background.paper, 1.0),
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
    };

    return (
        <Paper sx={sharedPaperStyles}>
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
    );
}

export default AccountSettings;

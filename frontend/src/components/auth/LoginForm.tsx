import {
    Box,
    Typography,
    Button,
    TextField,
    CircularProgress,
    InputAdornment,
    Link,
    alpha,
    useTheme
} from '@mui/material';
import {
    Lock as LockIcon,
    Email as EmailIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface LoginFormProps {
    email: string;
    onEmailChange: (val: string) => void;
    password: string;
    onPasswordChange: (val: string) => void;
    loading: boolean;
    error: string;
    success: string;
    onToggleMode: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function LoginForm({
    email,
    onEmailChange,
    password,
    onPasswordChange,
    loading,
    error,
    success,
    onToggleMode,
    onSubmit
}: LoginFormProps) {
    const theme = useTheme();

    return (
        <>
            <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment>,
                }}
            />

            <TextField
                fullWidth
                label="Encryption Password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" /></InputAdornment>,
                }}
            />

            {(error || success) && (
                <Box sx={{ minHeight: 24 }}>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', textAlign: 'center', fontWeight: 600 }}>
                                {error}
                            </Typography>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
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
                </Box>
            )}

            <Button
                fullWidth
                variant="contained"
                disabled={loading}
                onClick={onSubmit}
                sx={{
                    py: 1.5,
                    fontWeight: 700,
                    borderRadius: 2.5,
                    mt: 1,
                }}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Authenticate'}
            </Button>

            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}>
                Need a secure vault?
                <Link
                    component="button"
                    type="button"
                    onClick={onToggleMode}
                    sx={{ ml: 1, fontWeight: 700, textDecoration: 'none', color: 'primary.main' }}
                >
                    Register here
                </Link>
            </Typography>
        </>
    );
}

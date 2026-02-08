import {
    Box,
    Typography,
    Button,
    TextField,
    alpha,
    useTheme,
    Stack
} from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowForward as ArrowRightIcon } from '@mui/icons-material';
import { VaultLoadingAnimation } from './VaultLoadingAnimation';

interface LoginFormProps {
    email: string;
    onEmailChange: (val: string) => void;
    password: string;
    onPasswordChange: (val: string) => void;
    loading: boolean;
    error: string;
    success: string;
}

export function LoginForm({
    email,
    onEmailChange,
    password,
    onPasswordChange,
    loading,
    error,
    success,
}: LoginFormProps) {
    const theme = useTheme();

    return (
        <Box sx={{ width: '100%' }}>
            {/* Email Form */}
            <Stack spacing={1.5}>
                <Box>
                    <Typography variant="body2" fontWeight={800} sx={{ mb: 0.75, color: 'text.primary', opacity: 0.9, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Email Address
                    </Typography>
                    <TextField
                        fullWidth
                        id="login-email"
                        name="email"
                        autoComplete="email"
                        placeholder="e.g. name@company.com"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '24px',
                                bgcolor: alpha(theme.palette.background.paper, 0.4),
                                transition: 'all 0.2s ease-in-out',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                                    borderColor: alpha(theme.palette.primary.main, 0.3)
                                },
                                '&.Mui-focused': {
                                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                                    borderColor: theme.palette.primary.main,
                                    boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`
                                },
                                '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
                                    WebkitBoxShadow: `0 0 0 1000px ${alpha(theme.palette.background.paper, 0.4)} inset !important`,
                                    WebkitTextFillColor: `${theme.palette.text.primary} !important`,
                                    transition: 'background-color 5000s ease-in-out 0s',
                                    borderRadius: '24px !important',
                                    caretColor: theme.palette.text.primary,
                                },
                                overflow: 'hidden',
                            }
                        }}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" fontWeight={800} sx={{ mb: 0.75, color: 'text.primary', opacity: 0.9, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Encryption Password
                    </Typography>
                    <TextField
                        fullWidth
                        id="login-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '24px',
                                bgcolor: alpha(theme.palette.background.paper, 0.4),
                                transition: 'all 0.2s ease-in-out',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                                    borderColor: alpha(theme.palette.primary.main, 0.3)
                                },
                                '&.Mui-focused': {
                                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                                    borderColor: theme.palette.primary.main,
                                    boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`
                                },
                                '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
                                    WebkitBoxShadow: `0 0 0 1000px ${alpha(theme.palette.background.paper, 0.4)} inset !important`,
                                    WebkitTextFillColor: `${theme.palette.text.primary} !important`,
                                    transition: 'background-color 5000s ease-in-out 0s',
                                    borderRadius: '24px !important',
                                    caretColor: theme.palette.text.primary,
                                },
                                overflow: 'hidden',
                            }
                        }}
                    />
                </Box>

                {(error || success) && (
                    <Box sx={{ mt: 1 }}>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                                    {error}
                                </Typography>
                            </motion.div>
                        )}
                        {success && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                <Box sx={{ py: 1.5, px: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1), border: `1px solid ${alpha(theme.palette.success.main, 0.3)}` }}>
                                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
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
                    type="submit"
                    disabled={loading}
                    endIcon={!loading && <ArrowRightIcon />}
                    sx={{
                        py: 1.75,
                        fontWeight: 800,
                        borderRadius: 3,
                        mt: 1,
                        fontSize: '1rem',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        textTransform: 'none',
                        // Same styling for all states
                        bgcolor: alpha(theme.palette.action.disabled, 0.05),
                        color: 'text.secondary',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.action.disabled, 0.1),
                            transform: 'translateY(-1px)',
                        },
                        '&.Mui-disabled': {
                            bgcolor: alpha(theme.palette.action.disabled, 0.05),
                            color: 'text.secondary',
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        },
                        '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' }
                    }}
                >
                    {loading ? (
                        <VaultLoadingAnimation text="Authenticating..." size={22} />
                    ) : 'Log In to Vault'}
                </Button>
            </Stack>
        </Box>
    );
}

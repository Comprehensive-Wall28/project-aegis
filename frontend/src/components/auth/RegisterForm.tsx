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

interface RegisterFormProps {
    email: string;
    onEmailChange: (val: string) => void;
    username: string;
    onUsernameChange: (val: string) => void;
    password: string;
    onPasswordChange: (val: string) => void;
    loading: boolean;
    error: string;
    success: string;
}

export function RegisterForm({
    email,
    onEmailChange,
    username,
    onUsernameChange,
    password,
    onPasswordChange,
    loading,
    error,
    success,
}: RegisterFormProps) {
    const theme = useTheme();

    return (
        <Box sx={{ width: '100%' }}>
            {/* Form */}
            <Stack spacing={1.5}>
                <Box>
                    <Typography variant="body2" fontWeight={800} sx={{ mb: 0.75, color: 'text.primary', opacity: 0.9, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Username
                    </Typography>
                    <TextField
                        fullWidth
                        id="register-username"
                        name="username"
                        autoComplete="username"
                        placeholder="john_doe"
                        value={username}
                        onChange={(e) => onUsernameChange(e.target.value)}
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
                        Email Address
                    </Typography>
                    <TextField
                        fullWidth
                        id="register-email"
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
                        id="register-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
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

                {/* Password Strength */}
                <Box sx={{ mt: -0.5 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        {[1, 2, 3, 4].map((level) => {
                            const strength = password.length > 0 ? (
                                password.length > 12 ? 4 :
                                    password.length > 8 ? 3 :
                                        password.length > 5 ? 2 : 1
                            ) : 0;
                            const levelColor = strength === 0 ? 'action.hover' :
                                strength === 1 ? theme.palette.error.main :
                                    strength === 2 ? theme.palette.warning.main :
                                        strength === 3 ? theme.palette.info.main : theme.palette.primary.main;

                            return (
                                <Box
                                    key={level}
                                    sx={{
                                        height: 4,
                                        flex: 1,
                                        borderRadius: 2,
                                        bgcolor: level <= strength ? levelColor : alpha(theme.palette.divider, 0.1),
                                        boxShadow: level <= strength ? `0 0 10px ${alpha(levelColor, 0.3)}` : 'none',
                                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }}
                                />
                            );
                        })}
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.5, fontSize: '0.75rem', fontWeight: 500, opacity: 0.8 }}>
                        Use at least 8 characters. Encryption keys are derived from this password.
                    </Typography>
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
                        minHeight: 56, // Fixed height to prevent layout shift
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
                        <VaultLoadingAnimation text="Creating Vault..." size={22} />
                    ) : 'Initialize Secure Vault'}
                </Button>
            </Stack>
        </Box>
    );
}

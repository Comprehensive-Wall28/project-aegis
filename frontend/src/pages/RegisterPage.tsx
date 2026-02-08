import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '@/components/auth/RegisterForm';
import authService from '@/services/authService';
import { Box, Typography, Link, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const navigate = useNavigate();

    // Form State
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleRegister = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await authService.register(username, email, password);
            setSuccess('Vault created successfully! Redirecting to login...');
            // Optional: Redirect after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string; response?: { data?: { message?: string } } };
            console.error(err);
            if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
                setError(error.response?.data?.message || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthHeader
            title="Create your account"
            subtitle={
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2, fontWeight: 500 }}>
                    Already have an account?{' '}
                    <Link
                        onClick={() => navigate('/login')}
                        sx={{
                            color: 'primary.main',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            fontWeight: 700,
                            '&:hover': { textDecoration: 'underline' }
                        }}
                    >
                        Log In
                    </Link>
                </Typography>
            }
        >
            <form onSubmit={handleRegister}>
                <RegisterForm
                    email={email}
                    onEmailChange={setEmail}
                    username={username}
                    onUsernameChange={setUsername}
                    password={password}
                    onPasswordChange={setPassword}
                    loading={loading}
                    error={error}
                    success={success}
                />
            </form>
        </AuthHeader>
    );
}

// Helper component for standard auth header
function AuthHeader({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
    const theme = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            <Box sx={{ mb: 2 }}>
                <Typography
                    variant="h3"
                    sx={{
                        fontSize: { xs: '2.25rem', sm: '2.75rem' },
                        fontWeight: 950,
                        fontFamily: 'Outfit, sans-serif',
                        background: `linear-gradient(to bottom, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.8)} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.2)}`,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.1,
                        mb: 1
                    }}
                >
                    {title}
                </Typography>
                <Box>{subtitle}</Box>
            </Box>
            {children}
        </motion.div>
    );
}

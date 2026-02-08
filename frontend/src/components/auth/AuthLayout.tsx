import { Box, Typography, alpha, Link, useTheme } from '@mui/material';
import { AegisLogo } from '@/components/AegisLogo';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export function AuthLayout() {
    const theme = useTheme();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                bgcolor: 'background.default',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* Dynamic Background Effects - Mirrored from Hero.tsx */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
                zIndex: 0,
                pointerEvents: 'none'
            }}>
                {/* Animated Gradient Blobs */}
                <Box sx={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-5%',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                    animation: 'quantum-pulse 8s ease-in-out infinite'
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: '10%',
                    left: '-5%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.1)} 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                    animation: 'quantum-pulse 10s ease-in-out infinite alternate'
                }} />

                {/* Subtle Grid Pattern */}
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.05,
                    backgroundImage: `linear-gradient(${theme.palette.divider} 1px, transparent 1px), linear-gradient(90deg, ${theme.palette.divider} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
                }} />
            </Box>

            {/* Left Side - Form Container */}
            <Box
                sx={{
                    flex: { xs: 1, md: '0 0 500px', lg: '0 0 600px' },
                    display: 'flex',
                    flexDirection: 'column',
                    p: { xs: 3, sm: 6, md: 8 },
                    zIndex: 2,
                    bgcolor: 'transparent',
                    height: '100vh',
                    overflowY: 'hidden',
                    scrollbarWidth: 'none',
                    borderRight: `1px solid ${theme.palette.divider}`,
                    backdropFilter: 'blur(10px)',
                    '&::-webkit-scrollbar': { display: 'none' }
                }}
            >
                <Box sx={{ mb: 4 }}>
                    <RouterLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <AegisLogo size={32} disableLink />
                        <Typography
                            variant="h5"
                            fontWeight={900}
                            sx={{
                                color: 'primary.main',
                                letterSpacing: '-0.04em',
                                fontFamily: 'Outfit, sans-serif'
                            }}
                        >
                            Aegis
                        </Typography>
                    </RouterLink>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 440, mx: 'auto', width: '100%', py: 2 }}>
                    <Outlet />
                </Box>
            </Box>

            {/* Right Side - Branding/Illustration (Desktop only) */}
            <Box
                sx={{
                    display: { xs: 'none', md: 'flex' },
                    flex: 1,
                    position: 'relative',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    p: { md: 6, lg: 10 },
                    color: 'text.primary',
                    overflow: 'hidden',
                    height: '100vh',
                    zIndex: 1
                }}
            >
                <Box sx={{ maxWidth: 640 }}>
                    <Typography
                        variant="h1"
                        fontWeight={950}
                        sx={{
                            mb: 3,
                            fontSize: { md: '3.5rem', lg: '4.25rem' },
                            letterSpacing: '-0.05em',
                            background: `linear-gradient(to bottom, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.7)} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            lineHeight: 1.05,
                            fontFamily: 'Outfit, sans-serif',
                            textShadow: `0 10px 40px ${alpha(theme.palette.common.black, 0.4)}`
                        }}
                    >
                        Secure your digital identity for the{' '}
                        <Box component="span" sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main}, ${theme.palette.primary.main})`,
                            backgroundSize: '200% auto',
                            animation: 'shine 4s linear infinite',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'inline-block',
                            filter: 'drop-shadow(0 0 20px rgba(14, 165, 233, 0.4))'
                        }}>
                            Post-Quantum Era
                        </Box>
                    </Typography>

                    <Typography
                        variant="h6"
                        sx={{
                            mb: 4,
                            color: 'text.secondary',
                            fontWeight: 400,
                            lineHeight: 1.7,
                            maxWidth: 500,
                            opacity: 0.9
                        }}
                    >
                        Experience the next generation of secure identity management.
                        End-to-end encryption with post-quantum cryptography protection natively in your browser.
                    </Typography>

                    <Link
                        component={RouterLink}
                        to="/pqc-learn"
                        sx={{
                            color: theme.palette.text.primary,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            position: 'relative',
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                bottom: -2,
                                left: 0,
                                width: '40%',
                                height: '2px',
                                bgcolor: 'primary.main',
                                transition: 'width 0.3s ease'
                            },
                            '&:hover': {
                                color: 'primary.main',
                                '&::after': { width: '100%' }
                            }
                        }}
                    >
                        Learn about our security <span style={{ fontSize: '1.2rem' }}>→</span>
                    </Link>
                </Box>

                {/* Abstract MUI Illustration - Premium Version */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -40,
                        right: -40,
                        zIndex: -1,
                        opacity: 0.5,
                        filter: 'blur(2px)'
                    }}
                >
                    <Box
                        component={motion.div}
                        animate={{
                            rotate: [0, 5, 0],
                            y: [0, -20, 0]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        sx={{
                            width: 500,
                            height: 500,
                            borderRadius: '100px',
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`,
                            transform: 'rotate(-15deg)'
                        }}
                    />
                </Box>
            </Box>
            <style>{`
                @keyframes shine {
                    to { background-position: 200% center; }
                }
                @keyframes quantum-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.15; }
                    50% { transform: scale(1.05); opacity: 0.2; }
                }
            `}</style>
        </Box>
    );
}

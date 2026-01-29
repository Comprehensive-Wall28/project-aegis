import { Box, Container, Typography, useTheme, alpha, Button, Paper, Stack, Grid } from '@mui/material';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowBack, Security, Lock, Speed, GppGood, WarningAmber } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Section = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
    <Box
        component={motion.div}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        sx={{ mb: { xs: 8, md: 16 } }}
    >
        {children}
    </Box>
);

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
    const theme = useTheme();
    return (
        <Paper
            elevation={0}
            sx={{
                p: 4,
                height: '100%',
                bgcolor: alpha(theme.palette.background.paper, 0.05),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                borderRadius: 4,
                transition: 'all 0.3s ease',
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    transform: 'translateY(-4px)'
                }
            }}
        >
            <Box sx={{
                width: 48, height: 48,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mb: 3, color: 'primary.main'
            }}>
                <Icon fontSize="medium" />
            </Box>
            <Typography variant="h6" gutterBottom fontWeight="bold">
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {description}
            </Typography>
        </Paper>
    );
};

export function PqcLearn() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
            {/* Progress Bar */}
            <Box
                component={motion.div}
                style={{ scaleX }}
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    bgcolor: 'primary.main',
                    transformOrigin: '0%',
                    zIndex: 9999
                }}
            />

            {/* Navigation */}
            <Box sx={{ position: 'fixed', top: 24, left: 24, zIndex: 100 }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/')}
                    sx={{
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        '&:hover': { bgcolor: alpha(theme.palette.background.paper, 0.95) }
                    }}
                >
                    Back to Home
                </Button>
            </Box>

            <Container maxWidth="lg" sx={{ pt: { xs: 12, md: 20 }, pb: 12 }}>

                {/* Hero Section */}
                <Section>
                    <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto', mb: 8 }}>
                        <Typography
                            variant="overline"
                            sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 2, mb: 2, display: 'block' }}
                        >
                            THE FUTURE OF SECURITY
                        </Typography>
                        <Typography variant="h1" sx={{
                            fontSize: { xs: '2.5rem', md: '4.5rem' },
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            mb: 3,
                            background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.5)} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Understanding Post-Quantum Cryptography
                        </Typography>
                        <Typography variant="h5" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 600, mx: 'auto' }}>
                            Why your data needs protection from the computers of tomorrow, today.
                        </Typography>
                    </Box>
                </Section>

                {/* The Threat */}
                <Section>
                    <Grid container spacing={8} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ position: 'relative' }}>
                                <Box sx={{
                                    position: 'absolute', inset: -20,
                                    background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.error.main, 0.2)}, transparent 70%)`,
                                    filter: 'blur(40px)', zIndex: 0
                                }} />
                                <Typography variant="h3" gutterBottom fontWeight="bold">
                                    The Quantum Threat
                                </Typography>
                                <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: '1.1rem' }}>
                                    Current encryption standards (RSA, ECC) rely on mathematical problems that are hard for classical computers but trivial for quantum computers.
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                                    Shor's algorithm allows quantum computers to factor large integers exponentially faster, potentially exposing all currently encrypted data once powerful enough quantum hardware exists.
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper sx={{
                                p: 4,
                                bgcolor: alpha(theme.palette.error.main, 0.05),
                                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                                borderRadius: 4
                            }}>
                                <Stack spacing={3}>
                                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                                        <WarningAmber color="error" />
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Harvest Now, Decrypt Later</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Adversaries are collecting encrypted data today to decrypt it once quantum computers become available.
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                                        <Lock color="error" />
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Fragile Key Exchange</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Traditional key exchange methods like Diffie-Hellman are vulnerable to quantum attacks.
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>
                </Section>

                {/* The Solution */}
                <Section>
                    <Box sx={{ mb: 8, textAlign: 'center' }}>
                        <Typography variant="h3" fontWeight="bold" gutterBottom>
                            The Solution: ML-KEM
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
                            Aegis uses Module-Lattice-Based Key-Encapsulation Mechanism (ML-KEM), a standard chosen by NIST for post-quantum security.
                        </Typography>
                    </Box>
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FeatureCard
                                icon={Security}
                                title="Lattice-Based Math"
                                description="Uses complex lattice structures that are resistant to both classical and quantum attacks."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FeatureCard
                                icon={Speed}
                                title="High Performance"
                                description="Designed for efficiency with fast key generation and encapsulation processes."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FeatureCard
                                icon={GppGood}
                                title="NIST Standardized"
                                description="Based on CRYSTALS-Kyber, officially selected by NIST for post-quantum standardization."
                            />
                        </Grid>
                    </Grid>
                </Section>

                {/* Aegis Architecture */}
                <Section>
                    <Paper sx={{
                        p: { xs: 4, md: 8 },
                        bgcolor: alpha(theme.palette.background.paper, 0.05),
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        borderRadius: 8,
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <Box sx={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
                            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
                            pointerEvents: 'none'
                        }} />

                        <Grid container spacing={8} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="h3" gutterBottom fontWeight="bold">
                                    How Aegis Protects You
                                </Typography>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    We implement a hybrid approach, combining traditional strong encryption (AES-256) for data confidentiality with PQC (ML-KEM) for key establishment.
                                </Typography>
                                <Stack spacing={2} sx={{ mt: 4 }}>
                                    {['Client-side Encryption', 'Zero-Knowledge Architecture', 'Quantum-Safe Key Encapsulation'].map((item) => (
                                        <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                                            <Typography variant="body1" fontWeight={500}>{item}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Box sx={{
                                    p: 4,
                                    bgcolor: 'background.paper',
                                    borderRadius: 4,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    boxShadow: theme.shadows[4]
                                }}>
                                    <pre style={{
                                        fontFamily: 'JetBrains Mono',
                                        fontSize: '0.85rem',
                                        color: theme.palette.text.secondary,
                                        overflowX: 'auto'
                                    }}>
                                        {`// Aegis uses @noble/post-quantum
import { ml_kem768 } from '@noble/post-quantum';

// 1. Generate quantum-safe keypair
const keys = ml_kem768.keygen();

// 2. Encapsulate a shared secret
const { sharedSecret, cipherText } = 
  ml_kem768.encapsulate(keys.publicKey);

// Even quantum computers cannot
// derive sharedSecret from cipherText`}
                                    </pre>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Section>

                <Box sx={{ textAlign: 'center', mt: 12 }}>
                    <Typography variant="h2" gutterBottom fontWeight={800}>
                        Ready to get started?
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            mt: 4,
                            px: 6,
                            py: 2,
                            fontSize: '1.2rem',
                            borderRadius: 4,
                        }}
                    >
                        Get Started Now
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}

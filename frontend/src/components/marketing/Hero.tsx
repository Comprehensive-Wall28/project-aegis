import {
    Box,
    Typography,
    Container,
    alpha,
    useTheme,
    Paper,
    Stack,
    Button
} from '@mui/material';
import {
    ArrowForward as ArrowRightIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { StatelessIndicator } from "./StatelessIndicator";
import { useNavigate } from 'react-router-dom';
import { Grid } from '@mui/material';



export function Hero() {
    const theme = useTheme();
    const navigate = useNavigate();
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants: any = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
    };

    return (
        <Box component="section" sx={{
            position: 'relative',
            overflow: 'hidden',
            pt: { xs: 16, md: 24 },
            pb: { xs: 8, md: 16 },
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center'
        }}>
            {/* Mesh Gradient Background */}
            <Box sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                overflow: 'hidden',
                pointerEvents: 'none'
            }}>
                <Box sx={{
                    position: 'absolute',
                    top: '-15%',
                    left: '-15%',
                    width: '50%',
                    height: '50%',
                    bgcolor: alpha(theme.palette.primary.dark, 0.4),
                    borderRadius: '50%',
                    filter: 'blur(140px)',
                    animation: 'mesh 20s ease-in-out infinite'
                }} />
                <Box sx={{
                    position: 'absolute',
                    top: '15%',
                    right: '-10%',
                    width: '45%',
                    height: '45%',
                    bgcolor: alpha(theme.palette.info.dark, 0.3),
                    borderRadius: '50%',
                    filter: 'blur(120px)',
                    animation: 'mesh-delayed 25s ease-in-out infinite'
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: '5%',
                    left: '15%',
                    width: '55%',
                    height: '55%',
                    bgcolor: alpha(theme.palette.primary.dark, 0.35),
                    borderRadius: '50%',
                    filter: 'blur(160px)',
                    animation: 'mesh-slow 30s ease-in-out infinite'
                }} />
            </Box>

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10 }}>
                <Box
                    component={motion.div}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center'
                    }}
                >
                    <motion.div variants={itemVariants}>
                        <Box sx={{ mb: 4 }}>
                            <StatelessIndicator />
                        </Box>
                    </motion.div>

                    <Typography
                        component={motion.h1}
                        variants={itemVariants}
                        variant="h1"
                        sx={{
                            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem', lg: '5rem' },
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            color: 'text.primary',
                            mb: 3,
                            maxWidth: 900,
                            lineHeight: 1.1
                        }}
                    >
                        Quantum-Safe Productivity for the {' '}
                        <Box component="span" sx={{
                            background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.info.light})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            whiteSpace: 'nowrap'
                        }}>
                            Post-Quantum Era
                        </Box>
                    </Typography>

                    <Typography
                        component={motion.p}
                        variants={itemVariants}
                        sx={{
                            fontSize: { xs: '1.1rem', md: '1.25rem' },
                            color: 'text.secondary',
                            maxWidth: 700,
                            mb: 6,
                            lineHeight: 1.6,
                            fontWeight: 500
                        }}
                    >
                        Experience stateless productivity suite powered by ML-KEM encryption.
                        Your data never leaves your browser unencrypted.
                    </Typography>

                    <Box
                        component={motion.div}
                        variants={itemVariants}
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: 2,
                            width: { xs: '100%', sm: 'auto' }
                        }}
                    >
                        <Button
                            variant="contained"
                            size="large"
                            endIcon={<ArrowRightIcon />}
                            sx={{
                                px: 4,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 700,
                                borderRadius: 3,
                                boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                                '&:hover': {
                                    boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.6)}`,
                                    '& .MuiButton-endIcon': { transform: 'translateX(4px)' }
                                },
                                '& .MuiButton-endIcon': { transition: 'transform 0.2s' }
                            }}
                            onClick={() => navigate('/dashboard')}
                        >
                            Get Started
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            sx={{
                                px: 4,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 700,
                                borderRadius: 3,
                                borderColor: alpha(theme.palette.divider, 0.1),
                                bgcolor: alpha(theme.palette.background.paper, 0.05),
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                                }
                            }}
                            onClick={() => navigate('/pqc-learn')}
                        >
                            Learn about PQC
                        </Button>
                    </Box>

                    {/* Aegis Architecture Preview */}
                    <Paper
                        component={motion.div}
                        variants={itemVariants}
                        elevation={24}
                        sx={{
                            mt: 10,
                            width: '100%',
                            maxWidth: 1000,
                            borderRadius: { xs: 2, md: 4 },
                            overflow: 'hidden',
                            bgcolor: alpha(theme.palette.background.paper, 0.1),
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            position: 'relative',
                            p: { xs: 4, md: 6 }
                        }}
                    >
                        <Box sx={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
                            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
                            pointerEvents: 'none'
                        }} />

                        <Grid container spacing={6} alignItems="center" sx={{ position: 'relative', zIndex: 1, textAlign: 'left' }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                                    How Aegis Protects You
                                </Typography>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    We implement a hybrid approach, combining traditional strong encryption (AES-256) for data confidentiality with PQC (ML-KEM) for key establishment.
                                </Typography>
                                <Stack spacing={2} sx={{ mt: 3 }}>
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
                                    p: 3,
                                    bgcolor: 'background.paper',
                                    borderRadius: 3,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    boxShadow: theme.shadows[4]
                                }}>
                                    <pre style={{
                                        fontFamily: 'JetBrains Mono',
                                        fontSize: '0.85rem',
                                        color: theme.palette.text.secondary,
                                        overflowX: 'auto',
                                        margin: 0
                                    }}>
                                        {`// Aegis PQC Implementation
const pqc = new ML_KEM_768();

// 1. User generates keypair
const { pk, sk } = pqc.keypair();

// 2. Server encapsulates key
const { ss, ct } = pqc.encap(pk);

// 3. Secure channel established`}
                                    </pre>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            </Container>
            <style>{`
                @keyframes scan {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(100%); }
                }
                @keyframes mesh {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(5%, 5%); }
                }
                @keyframes mesh-delayed {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-5%, 5%); }
                }
                @keyframes mesh-slow {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(5%, -5%); }
                }
            `}</style>
        </Box>
    );
}

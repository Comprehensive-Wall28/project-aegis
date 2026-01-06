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
    ArrowForward as ArrowRightIcon,
    ShieldOutlined as ShieldCheckIcon,
    LockOutlined as LockIcon,
    Fingerprint as FingerprintIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { StatelessIndicator } from "./StatelessIndicator";
import { useEffect, useState } from "react";

function MerkleIntegrityFeed() {
    const theme = useTheme();
    const [hashes, setHashes] = useState<string[]>([]);

    useEffect(() => {
        const generateHash = () => Math.random().toString(16).substring(2, 10).toUpperCase();
        setHashes(Array.from({ length: 12 }, generateHash));
        const interval = setInterval(() => {
            setHashes(prev => [...prev.slice(1), generateHash()]);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const FeedItems = ({ offset = 0 }: { offset?: number }) => (
        <Box sx={{
            display: 'flex',
            gap: 8,
            px: 4,
            animation: 'scroll 30s linear infinite',
            '&:hover': { animationPlayState: 'paused' }
        }}>
            {hashes.map((hash, i) => (
                <Box key={i + offset} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: 'text.secondary', fontSize: '10px' }}>HASH:</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: 'text.primary', fontSize: '10px' }}>{hash}</Typography>
                    <Box
                        component={motion.div}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.5),
                            boxShadow: `0 0 8px ${alpha(theme.palette.primary.main, 0.5)}`
                        }}
                    />
                </Box>
            ))}
        </Box>
    );

    return (
        <Box sx={{
            width: '100%',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            py: 1.5,
            borderY: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
            bgcolor: alpha('#000', 0.2),
            display: 'flex',
            alignItems: 'center',
            position: 'relative'
        }}>
            <FeedItems />
            <FeedItems offset={12} />

            <style>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </Box>
    );
}

export function Hero() {
    const theme = useTheme();
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
                        Experience the world's first stateless productivity suite powered by ML-KEM encryption.
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
                        >
                            Secure Your Vault
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
                        >
                            Learn about PQC
                        </Button>
                    </Box>

                    {/* Product Preview */}
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
                            position: 'relative'
                        }}
                    >
                        {/* Fake UI Header */}
                        <Box sx={{
                            height: 32,
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            display: 'flex',
                            alignItems: 'center',
                            px: 2,
                            gap: 1,
                            bgcolor: alpha(theme.palette.background.paper, 0.05)
                        }}>
                            {[0, 1, 2].map(i => (
                                <Box key={i} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: alpha(theme.palette.text.primary, 0.1) }} />
                            ))}
                        </Box>

                        {/* Fake UI Body */}
                        <Box sx={{
                            aspectRatio: '16/9',
                            width: '100%',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.1)}, ${alpha(theme.palette.background.default, 1)})`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}>
                            <Stack direction="row" spacing={6} sx={{ opacity: 0.1, position: 'absolute' }}>
                                <ShieldCheckIcon sx={{ fontSize: 100 }} />
                                <LockIcon sx={{ fontSize: 100 }} />
                                <FingerprintIcon sx={{ fontSize: 100 }} />
                            </Stack>

                            <Box sx={{ zIndex: 1, textAlign: 'center' }}>
                                <Typography variant="overline" sx={{ letterSpacing: '0.3em', fontWeight: 700, color: 'primary.main', mb: 1, display: 'block' }}>
                                    Encrypted Session Active
                                </Typography>
                                <Typography variant="h4" sx={{ fontFamily: 'JetBrains Mono', fontWeight: 700, letterSpacing: -1, opacity: 0.9 }}>
                                    0x7F...3A9C
                                </Typography>
                            </Box>

                            {/* Scan line effect */}
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: `linear-gradient(to bottom, transparent, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`,
                                animation: 'scan 4s linear infinite',
                                pointerEvents: 'none'
                            }} />
                        </Box>

                        {/* Merkle Integrity Feed */}
                        <MerkleIntegrityFeed />
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

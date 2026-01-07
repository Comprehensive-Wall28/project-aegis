import {
    Box,
    Container,
    Typography,
    Paper,
    alpha,
    useTheme,
    Grid
} from '@mui/material';
import {
    ShieldOutlined as ShieldIcon,
    HubOutlined as GitGraphIcon,
    KeyOutlined as FileKeyIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const features = [
    {
        title: "Quantum Vault",
        description: "Client-side ML-KEM encryption ensures your private keys never leave your browser. Resistant to quantum computer attacks.",
        icon: ShieldIcon,
        color: "primary.main",
    },
    {
        title: "Merkle Integrity",
        description: "Tamper-proof verifiable logs using Merkle-Tree hashing. Calculate the root hash of your productivity history instantly.",
        icon: GitGraphIcon,
        color: "info.main",
    },
    {
        title: "ZKP Certificates",
        description: "Prove your merit without revealing raw data. Zero-Knowledge Proofs allow you to verify assertions privately.",
        icon: FileKeyIcon,
        color: "secondary.main",
    },
];

export function Features() {
    const theme = useTheme();

    return (
        <Box
            component="section"
            id="features"
            sx={{
                py: 16,
                position: 'relative',
                bgcolor: alpha('#000', 0.5)
            }}
        >
            <Container maxWidth="lg">
                <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mb: 10 }}>
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 900,
                            letterSpacing: -1,
                            color: 'text.primary',
                            mb: 2,
                            fontSize: { xs: '2rem', md: '3rem' }
                        }}
                    >
                        The Three Pillars of Aegis
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 500,
                            opacity: 0.8
                        }}
                    >
                        Security, Integrity, and Privacy woven into the fabric of your workflow.
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {features.map((feature, index) => (
                        <Grid size={{ xs: 12, md: 4 }} key={index}>
                            <Box
                                component={motion.div}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                height="100%"
                            >
                                <Paper
                                    variant="glass"
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.3s ease-in-out',
                                        '&:hover': {
                                            borderColor: feature.color,
                                            transform: 'translateY(-8px)',
                                            boxShadow: `0 12px 40px ${alpha(theme.palette.background.default, 0.4)}`,
                                            '& .feature-icon-box': {
                                                transform: 'scale(1.1)',
                                                bgcolor: alpha(theme.palette.primary.main, 0.15)
                                            }
                                        }
                                    }}
                                >
                                    <Box
                                        className="feature-icon-box"
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            width: 'fit-content',
                                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                                            mb: 3,
                                            transition: 'all 0.3s ease-in-out',
                                            display: 'flex'
                                        }}
                                    >
                                        <feature.icon sx={{ fontSize: 32, color: feature.color }} />
                                    </Box>
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 800,
                                            color: 'text.primary',
                                            mb: 2,
                                            letterSpacing: -0.5
                                        }}
                                    >
                                        {feature.title}
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: 'text.secondary',
                                            lineHeight: 1.7,
                                            fontSize: '1rem'
                                        }}
                                    >
                                        {feature.description}
                                    </Typography>
                                </Paper>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}

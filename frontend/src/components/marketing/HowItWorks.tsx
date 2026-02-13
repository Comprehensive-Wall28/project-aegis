import {
    Box,
    Container,
    Typography,
    Paper,
    alpha,
    useTheme
} from '@mui/material';
import {
    PersonAddOutlined as SignUpIcon,
    CloudUploadOutlined as UploadIcon,
    SecurityOutlined as SecurityIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const steps = [
    {
        number: '01',
        title: 'Create Your Account',
        description: 'Sign up and your browser generates a unique quantum-resistant keypair. Your private key never leaves your device.',
        icon: SignUpIcon,
        color: '#0ea5e9'
    },
    {
        number: '02',
        title: 'Store Everything Securely',
        description: 'Upload files, track your GPA, manage tasks, and schedule events. Everything is encrypted before it reaches our servers.',
        icon: UploadIcon,
        color: '#a855f7'
    },
    {
        number: '03',
        title: 'Stay Protected Forever',
        description: 'Access your data anytime, from any device. Your master key derives your encryption keys—we can never see your data.',
        icon: SecurityIcon,
        color: '#22c55e'
    }
];

export function HowItWorks() {
    const theme = useTheme();

    return (
        <Box
            id="how-it-works"
            component="section"
            sx={{
                py: { xs: 10, md: 16 },
                position: 'relative'
            }}
        >

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mb: { xs: 6, md: 10 } }}>
                    <Typography
                        variant="overline"
                        sx={{
                            color: theme.palette.info.main,
                            fontWeight: 700,
                            letterSpacing: 2,
                            mb: 2,
                            display: 'block'
                        }}
                    >
                        How It Works
                    </Typography>
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
                        Privacy Made Simple
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 500,
                            opacity: 1.0
                        }}
                    >
                        Three simple steps to quantum-safe productivity. No complexity, no compromises.
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: { xs: 3, md: 4 },
                    position: 'relative'
                }}>
                    {/* Connecting line for desktop */}
                    <Box sx={{
                        display: { xs: 'none', md: 'block' },
                        position: 'absolute',
                        top: '50%',
                        left: '10%',
                        right: '10%',
                        height: 2,
                        background: `linear-gradient(90deg, ${alpha(steps[0].color, 0.3)}, ${alpha(steps[1].color, 0.3)}, ${alpha(steps[2].color, 0.3)})`,
                        zIndex: 0
                    }} />

                    {steps.map((step, index) => (
                        <Box
                            component={motion.div}
                            key={step.number}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15, duration: 0.5 }}
                            sx={{ flex: 1, position: 'relative', zIndex: 1 }}
                        >
                            <Paper
                                elevation={2}
                                sx={{
                                    p: { xs: 3, md: 4 },
                                    textAlign: 'center',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: step.color,
                                        boxShadow: `0 20px 40px ${alpha(step.color, 0.25)}`
                                    }
                                }}
                            >
                                {/* Step number badge */}
                                <Box sx={{
                                    position: 'absolute',
                                    top: -12,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    px: 2,
                                    py: 0.5,
                                    bgcolor: step.color,
                                    color: '#fff',
                                    borderRadius: 2,
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    letterSpacing: 1
                                }}>
                                    STEP {step.number}
                                </Box>

                                <Box sx={{
                                    mt: 2,
                                    mb: 2,
                                    p: 2,
                                    borderRadius: '50%',
                                    bgcolor: alpha(step.color, 0.2),
                                    display: 'flex'
                                }}>
                                    <step.icon sx={{ fontSize: 40, color: step.color }} />
                                </Box>

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 800,
                                        color: 'text.primary',
                                        mb: 1.5,
                                        letterSpacing: -0.5
                                    }}
                                >
                                    {step.title}
                                </Typography>

                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'text.secondary',
                                        lineHeight: 1.7
                                    }}
                                >
                                    {step.description}
                                </Typography>
                            </Paper>
                        </Box>
                    ))}
                </Box>

            </Container>
        </Box>
    );
}

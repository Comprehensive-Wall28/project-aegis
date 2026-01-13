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
    FolderOutlined as FolderIcon,
    SchoolOutlined as SchoolIcon,
    CheckCircleOutlined as TaskIcon,
    CalendarMonthOutlined as CalendarIcon,
    LockOutlined as LockIcon,
    SecurityOutlined as SecurityIcon,
    VisibilityOffOutlined as PrivacyIcon
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

                    {/* Feature Preview Grid */}
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
                            p: { xs: 3, md: 5 }
                        }}
                    >
                        <Box sx={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
                            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
                            pointerEvents: 'none'
                        }} />

                        <Grid container spacing={4} sx={{ position: 'relative', zIndex: 1 }}>
                            <Grid size={{ xs: 12, md: 5 }}>
                                <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' } }}>
                                    Your Private Productivity Hub
                                </Typography>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    Aegis combines powerful productivity tools with military-grade encryption. Everything you store is encrypted on your device before it ever touches our servers.
                                </Typography>
                                <Stack spacing={1.5} sx={{ mt: 3 }}>
                                    {[
                                        { Icon: LockIcon, text: 'Client-side Encryption' },
                                        { Icon: SecurityIcon, text: 'Quantum-Safe Keys' },
                                        { Icon: PrivacyIcon, text: 'Zero-Knowledge Design' }
                                    ].map((item) => (
                                        <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{
                                                p: 0.75,
                                                borderRadius: '50%',
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                display: 'flex'
                                            }}>
                                                <item.Icon sx={{ fontSize: 16, color: 'primary.main' }} />
                                            </Box>
                                            <Typography variant="body1" fontWeight={500}>{item.text}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, md: 7 }}>
                                <Grid container spacing={2}>
                                    {[
                                        { Icon: FolderIcon, title: 'File Vault', desc: 'Encrypted storage', color: '#0ea5e9' },
                                        { Icon: SchoolIcon, title: 'GPA Tracker', desc: 'Academic records', color: '#a855f7' },
                                        { Icon: TaskIcon, title: 'Task Manager', desc: 'Kanban & lists', color: '#22c55e' },
                                        { Icon: CalendarIcon, title: 'Calendar', desc: 'Event planning', color: '#f59e0b' }
                                    ].map((feature) => (
                                        <Grid size={{ xs: 6 }} key={feature.title}>
                                            <Box sx={{
                                                p: 2,
                                                bgcolor: alpha(feature.color, 0.08),
                                                borderRadius: 2,
                                                border: `1px solid ${alpha(feature.color, 0.15)}`,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    bgcolor: alpha(feature.color, 0.12),
                                                    boxShadow: `0 4px 12px ${alpha(feature.color, 0.2)}`
                                                }
                                            }}>
                                                <Box sx={{
                                                    p: 1.25,
                                                    borderRadius: '50%',
                                                    bgcolor: alpha(feature.color, 0.15),
                                                    display: 'inline-flex',
                                                    mb: 1.5
                                                }}>
                                                    <feature.Icon sx={{ fontSize: 24, color: feature.color }} />
                                                </Box>
                                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: feature.color }}>
                                                    {feature.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {feature.desc}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
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
            `}</style>
        </Box>
    );
}

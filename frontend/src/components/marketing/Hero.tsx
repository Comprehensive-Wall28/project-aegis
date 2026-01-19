import {
    Box,
    Typography,
    Container,
    alpha,
    useTheme,
    Paper,
    Stack,
    Button,
    Grid
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
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthModalStore } from '@/stores/authModalStore';

export function Hero() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { isAuthenticated } = useSessionStore();
    const openAuthModal = useAuthModalStore((state) => state.openModal);
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
            pt: { xs: 14, sm: 16, md: 20 },
            pb: { xs: 8, sm: 10, md: 12 },
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'background.default'
        }}>
            {/* Dynamic Background Effects */}
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
                <Box className="animate-mesh" sx={{
                    position: 'absolute',
                    top: { xs: '0%', md: '-10%' },
                    right: { xs: '-10%', md: '-5%' },
                    width: { xs: '400px', md: '600px' },
                    height: { xs: '400px', md: '600px' },
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                }} />
                <Box className="animate-mesh-delayed" sx={{
                    position: 'absolute',
                    bottom: { xs: '5%', md: '10%' },
                    left: { xs: '-10%', md: '-5%' },
                    width: { xs: '350px', md: '500px' },
                    height: { xs: '350px', md: '500px' },
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.1)} 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                }} />
                <Box className="animate-mesh-slow" sx={{
                    position: 'absolute',
                    top: '25%',
                    left: '15%',
                    width: { xs: '300px', md: '400px' },
                    height: { xs: '300px', md: '400px' },
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 70%)`,
                    filter: 'blur(100px)',
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
                        <Box sx={{
                            mb: { xs: 3, md: 4 },
                            '& > *': {
                                animation: 'quantum-pulse 4s ease-in-out infinite'
                            }
                        }}>
                            <StatelessIndicator />
                        </Box>
                    </motion.div>

                    <Typography
                        component={motion.h1}
                        variants={itemVariants}
                        variant="h1"
                        sx={{
                            fontSize: { xs: '2.25rem', sm: '3.25rem', md: '5rem', lg: '5.5rem' },
                            fontWeight: 950,
                            letterSpacing: '-0.03em',
                            color: 'text.primary',
                            mb: 3,
                            maxWidth: 1000,
                            lineHeight: { xs: 1.1, md: 1.05 },
                            textShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.5)}`
                        }}
                    >
                        Productivity Reimagined for the {' '}
                        <Box component="span" sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.info.light})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            whiteSpace: { xs: 'normal', sm: 'nowrap' },
                            display: 'inline-block',
                            filter: 'drop-shadow(0 0 15px rgba(14, 165, 233, 0.3))'
                        }}>
                            Post-Quantum Era
                        </Box>
                    </Typography>

                    <Typography
                        component={motion.p}
                        variants={itemVariants}
                        sx={{
                            fontSize: { xs: '1.05rem', sm: '1.2rem', md: '1.35rem' },
                            color: 'text.secondary',
                            maxWidth: 750,
                            mb: { xs: 5, md: 6 },
                            lineHeight: 1.7,
                            fontWeight: 400,
                            textWrap: 'balance',
                            px: { xs: 2, sm: 0 }
                        }}
                    >
                        A stateless productivity suite powered by ML-KEM encryption.
                        Experience total data sovereignty with private-by-design architecture.
                    </Typography>

                    <Box
                        component={motion.div}
                        variants={itemVariants}
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 2, sm: 2.5 },
                            width: { xs: '100%', sm: 'auto' },
                            px: { xs: 2, sm: 0 }
                        }}
                    >
                        <Button
                            variant="contained"
                            size="large"
                            endIcon={<ArrowRightIcon />}
                            sx={{
                                px: { xs: 4, sm: 5 },
                                py: { xs: 1.75, sm: 2 },
                                fontSize: { xs: '1rem', sm: '1.1rem' },
                                fontWeight: 800,
                                borderRadius: 4,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.3)}`,
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                '&:hover': {
                                    transform: 'scale(1.05) translateY(-2px)',
                                    boxShadow: `0 12px 35px ${alpha(theme.palette.primary.main, 0.5)}`,
                                    '& .MuiButton-endIcon': { transform: 'translateX(6px)' }
                                },
                                '& .MuiButton-endIcon': { transition: 'transform 0.3s ease' }
                            }}
                            onClick={() => {
                                if (isAuthenticated) {
                                    navigate('/dashboard');
                                } else {
                                    openAuthModal('register');
                                }
                            }}
                        >
                            Get Started
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            sx={{
                                px: { xs: 4, sm: 5 },
                                py: { xs: 1.75, sm: 2 },
                                fontSize: { xs: '1rem', sm: '1.1rem' },
                                fontWeight: 700,
                                borderRadius: 4,
                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                bgcolor: alpha(theme.palette.background.paper, 0.5),
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    transform: 'translateY(-2px)'
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
                            position: 'relative',
                            p: { xs: 3, md: 5 }
                        }}
                    >

                        <Grid container spacing={4} sx={{ position: 'relative', zIndex: 1 }}>
                            <Grid size={{ xs: 12, md: 5 }}>
                                <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' }, textAlign: 'left' }}>
                                    Your Private Productivity Hub
                                </Typography>
                                <Typography variant="body1" color="text.secondary" paragraph sx={{ textAlign: 'left' }}>
                                    Aegis combines powerful productivity tools with military-grade encryption. Everything you store is encrypted on your device before it ever touches our servers.
                                </Typography>
                                <Stack spacing={1.5} sx={{ mt: 3 }}>
                                    {[
                                        { Icon: LockIcon, text: 'Client-side Encryption' },
                                        { Icon: SecurityIcon, text: 'Quantum-Safe Keys' },
                                        { Icon: PrivacyIcon, text: 'Zero-Access Architecture' }
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
                                                bgcolor: alpha(feature.color, 0.1),
                                                borderRadius: 2,
                                                border: `1px solid ${alpha(feature.color, 0.2)}`,
                                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                textAlign: 'left',
                                                '&:hover': {
                                                    transform: 'translateY(-4px) scale(1.02)',
                                                    bgcolor: alpha(feature.color, 0.15),
                                                    border: `1px solid ${alpha(feature.color, 0.4)}`,
                                                    boxShadow: `0 8px 24px ${alpha(feature.color, 0.25)}`
                                                }
                                            }}>
                                                <Box sx={{
                                                    p: 1.25,
                                                    borderRadius: '50%',
                                                    bgcolor: alpha(feature.color, 0.2),
                                                    display: 'inline-flex',
                                                    mb: 1.5
                                                }}>
                                                    <feature.Icon sx={{ fontSize: 24, color: feature.color }} />
                                                </Box>
                                                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.primary', mb: 0.5 }}>
                                                    {feature.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
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

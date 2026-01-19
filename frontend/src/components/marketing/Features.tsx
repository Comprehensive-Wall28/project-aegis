import {
    Box,
    Container,
    Typography,
    Paper,
    alpha,
    useTheme,
    Grid,
    Chip
} from '@mui/material';
import {
    ShieldOutlined as ShieldIcon,
    HubOutlined as GitGraphIcon,
    KeyOutlined as FileKeyIcon,
    FolderOutlined as FolderIcon,
    SchoolOutlined as GpaIcon,
    ChecklistOutlined as TaskIcon,
    CalendarMonthOutlined as CalendarIcon,
    LockOutlined as LockIcon,
    VerifiedUserOutlined as VerifiedIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Core productivity features
const productivityFeatures = [
    {
        title: "Secure File Vault",
        description: "Upload, organize, and securely store your files with client-side encryption. Your data stays yours—encrypted before it ever leaves your browser.",
        icon: FolderIcon,
        color: "#0ea5e9", // Sky blue
        tag: "Storage"
    },
    {
        title: "GPA Tracker",
        description: "Track your academic performance with tamper-proof records. Supports both Normal (4.0) and German grading systems with beautiful visualizations.",
        icon: GpaIcon,
        color: "#a855f7", // Purple
        tag: "Academic"
    },
    {
        title: "Task Manager",
        description: "Organize your work with intuitive Kanban boards and list views. Drag and drop tasks between columns, set priorities, and track progress.",
        icon: TaskIcon,
        color: "#22c55e", // Green
        tag: "Productivity"
    },
    {
        title: "Calendar",
        description: "Schedule events and manage your time with a full-featured calendar. Day, week, and month views with drag-and-drop event creation.",
        icon: CalendarIcon,
        color: "#f59e0b", // Amber
        tag: "Planning"
    },
];

// Security foundation pillars
const securityFeatures = [
    {
        title: "Quantum Vault",
        description: "ML-KEM encryption ensures your private keys never leave your browser. Future-proof against quantum computer attacks.",
        icon: ShieldIcon,
        color: "#0ea5e9", // Sky blue
    },
    {
        title: "Verifiable Data Integrity",
        description: "Ensure your data hasn't been altered using Merkle-Tree hashing verification. Verify the integrity of your data instantly.",
        icon: GitGraphIcon,
        color: "#0ea5e9", // Sky blue
    },
    {
        title: "Zero-Access",
        description: "Your encryption keys are derived on your device. We never see your password or unencrypted data.",
        icon: FileKeyIcon,
        color: "#0ea5e9", // Sky blue
    },
];

export function Features() {
    const theme = useTheme();

    return (
        <Box component="section" id="features">
            {/* Core Features Section */}
            <Box
                sx={{
                    py: { xs: 6, md: 10 },
                    position: 'relative',
                    bgcolor: theme.palette.background.default
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto', mb: { xs: 4, md: 6 } }}>
                        <Chip
                            label="Core Features"
                            sx={{
                                mb: 3,
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                                fontSize: '0.8rem'
                            }}
                        />
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
                            Everything You Need,{' '}
                            <Box component="span" sx={{
                                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                Quantum-Secured
                            </Box>
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 500,
                                opacity: 1.0,
                                maxWidth: 600,
                                mx: 'auto'
                            }}
                        >
                            A complete productivity suite where every feature is built with privacy-first encryption.
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {productivityFeatures.map((feature, index) => (
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                    height="100%"
                                >
                                    <Paper
                                        elevation={2}
                                        sx={{
                                            p: 3,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'all 0.3s ease-in-out',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                borderColor: feature.color,
                                                transform: 'translateY(-8px)',
                                                boxShadow: `0 20px 40px ${alpha(feature.color, 0.2)}`,
                                                '& .feature-icon-box': {
                                                    transform: 'scale(1.1) rotate(5deg)',
                                                    boxShadow: `0 8px 24px ${alpha(feature.color, 0.3)}`
                                                }
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box
                                                className="feature-icon-box"
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2.5,
                                                    bgcolor: alpha(feature.color, 0.2),
                                                    transition: 'all 0.3s ease-in-out',
                                                    display: 'flex'
                                                }}
                                            >
                                                <feature.icon sx={{ fontSize: 28, color: feature.color }} />
                                            </Box>
                                            <Chip
                                                label={feature.tag}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(feature.color, 0.2),
                                                    color: feature.color,
                                                    fontWeight: 600,
                                                    fontSize: '0.7rem'
                                                }}
                                            />
                                        </Box>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: 800,
                                                color: 'text.primary',
                                                mb: 1.5,
                                                letterSpacing: -0.5
                                            }}
                                        >
                                            {feature.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: 'text.secondary',
                                                lineHeight: 1.7,
                                                flex: 1
                                            }}
                                        >
                                            {feature.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.25)}` }}>
                                            <LockIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                                                End-to-end encrypted
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Security Foundation Section */}
            <Box
                id="security"
                sx={{
                    py: { xs: 6, md: 10 },
                    position: 'relative'
                }}
            >

                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto', mb: { xs: 4, md: 6 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 3 }}>
                            <VerifiedIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
                            <Typography
                                variant="overline"
                                sx={{
                                    color: theme.palette.primary.main,
                                    fontWeight: 700,
                                    letterSpacing: 2
                                }}
                            >
                                Security Foundation
                            </Typography>
                        </Box>
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
                            Built on Three Pillars
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 500,
                                opacity: 1.0
                            }}
                        >
                            Security, Integrity, and Privacy woven into the fabric of your workflow.
                        </Typography>
                    </Box>

                    <Grid container spacing={4}>
                        {securityFeatures.map((feature, index) => (
                            <Grid size={{ xs: 12, md: 4 }} key={index}>
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.15, duration: 0.5 }}
                                    height="100%"
                                >
                                    <Paper
                                        elevation={2}
                                        sx={{
                                            p: 4,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': {
                                                borderColor: feature.color,
                                                transform: 'translateY(-8px)',
                                                boxShadow: `0 20px 40px ${alpha(feature.color, 0.15)}`,
                                                '& .feature-icon-box': {
                                                    transform: 'scale(1.15)',
                                                    bgcolor: alpha(feature.color, 0.2)
                                                }
                                            }
                                        }}
                                    >
                                        <Box
                                            className="feature-icon-box"
                                            sx={{
                                                p: 2.5,
                                                borderRadius: '50%',
                                                bgcolor: alpha(feature.color, 0.1),
                                                mb: 3,
                                                transition: 'all 0.3s ease-in-out',
                                                display: 'flex'
                                            }}
                                        >
                                            <feature.icon sx={{ fontSize: 36, color: feature.color }} />
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
                                                lineHeight: 1.7
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
        </Box>
    );
}

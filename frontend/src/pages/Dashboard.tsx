import { VaultQuickView } from '@/components/dashboard/widgets/VaultQuickView';
import { GPASnapshot } from '@/components/dashboard/widgets/GPASnapshot';
import { Activity, Zap, Lock, ArrowUpRight } from 'lucide-react';
import { Box, Grid, Typography, Paper, useTheme, alpha, IconButton } from '@mui/material';
import { motion } from 'framer-motion';

export function Dashboard() {
    const theme = useTheme();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1] as [number, number, number, number] // Custom easeOutQuint for smoother feeling
            }
        }
    };

    const sharedPaperStyles = {
        p: 3,
        height: '100%',
        borderRadius: '16px', // Consistent thin rounded corners
        bgcolor: alpha(theme.palette.background.paper, 0.4), // Glass-like base
        backdropFilter: 'blur(12px)',
        border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        '&:hover': {
            borderColor: alpha(theme.palette.common.white, 0.1),
            boxShadow: '0 8px 32px -2px rgba(0, 0, 0, 0.3)',
        }
    };

    return (
        <Box
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            sx={{ maxWidth: 1600, mx: 'auto', p: { xs: 2, md: 3 } }}
        >
            <Grid container spacing={3}>
                {/* 1. Vault Quick-View: Main Feature (Top Left) - Spans 8 cols */}
                <Grid size={{ xs: 12, lg: 8 }} sx={{ minHeight: { lg: 400 } }}>
                    <Box component={motion.div} variants={itemVariants} sx={{ height: '100%' }}>
                        <VaultQuickView />
                    </Box>
                </Grid>

                {/* 2. GPA Snapshot & Live Metrics (Right Col) - Spans 4 cols */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Grid container spacing={3} direction="column" sx={{ height: '100%' }}>
                        {/* GPA Snapshot */}
                        <Grid size={12} sx={{ flex: 1 }}>
                            <Box component={motion.div} variants={itemVariants} sx={{ height: '100%' }}>
                                <GPASnapshot />
                            </Box>
                        </Grid>

                        {/* Live Metrics */}
                        <Grid size={12} sx={{ flex: 1 }}>
                            <Box component={motion.div} variants={itemVariants} sx={{ height: '100%' }}>
                                <Paper sx={{ ...sharedPaperStyles, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                            <Activity size={16} /> SYSTEM ACTIVITY
                                        </Typography>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', p: 1.5, borderRadius: '12px', bgcolor: alpha(theme.palette.common.white, 0.02) }}>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Encryptions Today</Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: 'JetBrains Mono' }}>0</Typography>
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono' }}>OPS</Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: '12px', bgcolor: alpha(theme.palette.common.white, 0.02) }}>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Integrity Monitor</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>Active & Secure</Typography>
                                            </Box>
                                            <Activity size={18} color="#10b981" />
                                        </Box>
                                    </Box>
                                </Paper>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>

                {/* 3. Action Cards Row */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box component={motion.div} variants={itemVariants}>
                        <Paper
                            sx={{
                                ...sharedPaperStyles,
                                p: 0, // Reset padding for custom internal layout
                                display: 'flex',
                                alignItems: 'center',
                                position: 'relative',
                                cursor: 'pointer',
                                height: 100,
                                '&:hover .icon-box': {
                                    transform: 'scale(1.1) rotate(5deg)',
                                    bgcolor: alpha(theme.palette.primary.main, 0.2)
                                },
                                '&:hover .arrow-icon': {
                                    transform: 'translate(2px, -2px)',
                                    opacity: 1
                                }
                            }}
                        >
                            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3, width: '100%' }}>
                                <Box
                                    className="icon-box"
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: '16px',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        color: theme.palette.primary.main
                                    }}
                                >
                                    <Zap size={28} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Quick Encrypt</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Drag & drop to protect with ML-KEM</Typography>
                                </Box>
                                <IconButton
                                    className="arrow-icon"
                                    sx={{
                                        opacity: 0.5,
                                        transition: 'all 0.3s ease',
                                        color: 'text.primary'
                                    }}
                                >
                                    <ArrowUpRight size={24} />
                                </IconButton>
                            </Box>
                        </Paper>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Box component={motion.div} variants={itemVariants}>
                        <Paper
                            sx={{
                                ...sharedPaperStyles,
                                p: 0,
                                display: 'flex',
                                alignItems: 'center',
                                position: 'relative',
                                cursor: 'pointer',
                                height: 100,
                                '&:hover .icon-box': {
                                    transform: 'scale(1.1) rotate(-5deg)',
                                    bgcolor: alpha('#a78bfa', 0.2)
                                },
                                '&:hover .arrow-icon': {
                                    transform: 'translate(2px, -2px)',
                                    opacity: 1
                                }
                            }}
                        >
                            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3, width: '100%' }}>
                                <Box
                                    className="icon-box"
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: '16px',
                                        bgcolor: alpha('#8b5cf6', 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        color: '#a78bfa'
                                    }}
                                >
                                    <Lock size={28} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Key Rotation</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Manage your post-quantum keys</Typography>
                                </Box>
                                <IconButton
                                    className="arrow-icon"
                                    sx={{
                                        opacity: 0.5,
                                        transition: 'all 0.3s ease',
                                        color: 'text.primary'
                                    }}
                                >
                                    <ArrowUpRight size={24} />
                                </IconButton>
                            </Box>
                        </Paper>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}

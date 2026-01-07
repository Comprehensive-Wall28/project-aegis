import { VaultQuickView } from '@/components/dashboard/widgets/VaultQuickView';
import { GPASnapshot } from '@/components/dashboard/widgets/GPASnapshot';
import { Zap, Lock, ArrowUpRight } from 'lucide-react';
import { Box, Grid, Typography, Paper, useTheme, alpha } from '@mui/material';
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

                        {/* Quick Actions Panel */}
                        <Grid size={12} sx={{ flex: 1 }}>
                            <Box component={motion.div} variants={itemVariants} sx={{ height: '100%' }}>
                                <Paper sx={{ ...sharedPaperStyles, p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                    <Box sx={{ px: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.1em', fontSize: '10px' }}>
                                            QUICK ACTIONS
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {/* Quick Encrypt */}
                                        <Box
                                            component={motion.div}
                                            whileHover={{ x: 4 }}
                                            sx={{
                                                p: 2,
                                                borderRadius: '16px',
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                                    borderColor: alpha(theme.palette.primary.main, 0.4),
                                                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`
                                                }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '12px',
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: theme.palette.primary.main
                                                }}
                                            >
                                                <Zap size={20} />
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Quick Encrypt</Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '10px' }}>Protect with ML-KEM</Typography>
                                            </Box>
                                            <ArrowUpRight size={16} style={{ opacity: 0.3 }} />
                                        </Box>

                                        {/* Key Rotation */}
                                        <Box
                                            component={motion.div}
                                            whileHover={{ x: 4 }}
                                            sx={{
                                                p: 2,
                                                borderRadius: '16px',
                                                bgcolor: alpha('#8b5cf6', 0.08),
                                                border: `1px solid ${alpha('#8b5cf6', 0.15)}`,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    bgcolor: alpha('#8b5cf6', 0.12),
                                                    borderColor: alpha('#8b5cf6', 0.4),
                                                    boxShadow: `0 4px 12px ${alpha('#8b5cf6', 0.1)}`
                                                }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '12px',
                                                    bgcolor: alpha('#8b5cf6', 0.1),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#a78bfa'
                                                }}
                                            >
                                                <Lock size={20} />
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Key Rotation</Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '10px' }}>Rotate PQC Keys</Typography>
                                            </Box>
                                            <ArrowUpRight size={16} style={{ opacity: 0.3 }} />
                                        </Box>
                                    </Box>
                                </Paper>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>

            </Grid>
        </Box>
    );
}

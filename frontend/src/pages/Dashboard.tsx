import { VaultQuickView } from '@/components/dashboard/widgets/VaultQuickView';
import { IntegrityMonitor } from '@/components/dashboard/widgets/IntegrityMonitor';
import { GPASnapshot } from '@/components/dashboard/widgets/GPASnapshot';
import { Activity, Zap, Lock } from 'lucide-react';
import { Box, Grid, Typography, Paper, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';

export function Dashboard() {
    const theme = useTheme();

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
            }
        }
    };

    return (
        <Box
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={{
                visible: {
                    transition: {
                        staggerChildren: 0.08
                    }
                }
            }}
        >
            <Grid container spacing={2.5}>
                {/* Vault Quick-View: 3/4 Width */}
                <Grid size={{ xs: 12, lg: 9 }}>
                    <Box
                        component={motion.div}
                        variants={itemVariants}
                        sx={{ height: '100%' }}
                    >
                        <VaultQuickView />
                    </Box>
                </Grid>

                {/* Right Column: GPA + Metrics */}
                <Grid size={{ xs: 12, lg: 3 }}>
                    <Grid container spacing={2.5} direction="column">
                        {/* GPA Snapshot */}
                        <Grid size={12}>
                            <Box
                                component={motion.div}
                                variants={itemVariants}
                            >
                                <GPASnapshot />
                            </Box>
                        </Grid>

                        {/* System Metrics */}
                        <Grid size={12}>
                            <Box
                                component={motion.div}
                                variants={itemVariants}
                            >
                                <Paper
                                    variant="glass"
                                    sx={{
                                        p: 3,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <Typography
                                        variant="overline"
                                        sx={{
                                            fontWeight: 700,
                                            letterSpacing: 1.5,
                                            color: (t) => alpha(t.palette.primary.main, 0.6),
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            mb: 2,
                                        }}
                                    >
                                        <Activity size={14} color={theme.palette.primary.main} />
                                        Live Metrics
                                    </Typography>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                Encryption Ops
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: 'text.primary' }}>
                                                0
                                            </Typography>
                                        </Box>
                                        <Box sx={{ height: '1px', bgcolor: 'divider' }} />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                Integrity Checks
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: alpha(theme.palette.primary.main, 0.8) }}>
                                                Standby
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Integrity Monitor */}
                <Grid size={12}>
                    <Box
                        component={motion.div}
                        variants={itemVariants}
                    >
                        <IntegrityMonitor />
                    </Box>
                </Grid>

                {/* Action Buttons */}
                <Grid size={12}>
                    <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box
                                component={motion.div}
                                variants={itemVariants}
                            >
                                <Paper
                                    variant="glass"
                                    sx={{
                                        p: 3,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.common.white, 0.08),
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Zap size={20} color={theme.palette.primary.main} />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', display: 'block' }}>
                                            Quick Encrypt
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                                            Upload & protect with ML-KEM
                                        </Typography>
                                    </Box>
                                </Paper>
                            </Box>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box
                                component={motion.div}
                                variants={itemVariants}
                            >
                                <Paper
                                    variant="glass"
                                    sx={{
                                        p: 3,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.common.white, 0.08),
                                            borderColor: alpha('#a78bfa', 0.3), // Violet accent
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: alpha('#8b5cf6', 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Lock size={20} color="#a78bfa" />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', display: 'block' }}>
                                            Key Rotation
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                                            Rotate PQC keys regularly
                                        </Typography>
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

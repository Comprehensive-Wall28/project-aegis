import { VaultQuickView } from '@/components/dashboard/widgets/VaultQuickView';
import { GPASnapshot } from '@/components/dashboard/widgets/GPASnapshot';
import { LiveActivityWidget } from '@/components/dashboard/widgets/LiveActivityWidget';
import { Box, Grid } from '@mui/material';
import { motion, type Variants } from 'framer-motion';

export function Dashboard() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: 'easeOut'
            }
        }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <Box
                sx={{
                    maxWidth: 1600,
                    mx: 'auto',
                    p: { xs: 1.5, sm: 2, md: 3 },
                }}
            >
                <Grid container spacing={{ xs: 2, md: 3 }}>
                    {/* 1. Vault Quick-View: Main Feature (Top Left) - Spans 8 cols */}
                    <Grid size={{ xs: 12, lg: 8 }} sx={{ minHeight: { lg: 400 } }}>
                        <motion.div
                            variants={itemVariants}
                            style={{ height: '100%' }}
                        >
                            <Box sx={{ height: '100%' }}>
                                <VaultQuickView />
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* 2. GPA Snapshot & Live Metrics (Right Col) - Spans 4 cols */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <Grid container spacing={3} direction="column" sx={{ height: '100%' }}>
                            {/* GPA Snapshot */}
                            <Grid size={12} sx={{ flex: 1 }}>
                                <motion.div
                                    variants={itemVariants}
                                    style={{ height: '100%' }}
                                >
                                    <Box sx={{ height: '100%' }}>
                                        <GPASnapshot />
                                    </Box>
                                </motion.div>
                            </Grid>

                            {/* Live Activity Widget */}
                            <Grid size={12} sx={{ flex: 1 }}>
                                <motion.div
                                    variants={itemVariants}
                                    style={{ height: '100%' }}
                                >
                                    <Box sx={{ height: '100%' }}>
                                        <LiveActivityWidget />
                                    </Box>
                                </motion.div>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
        </motion.div>
    );
}

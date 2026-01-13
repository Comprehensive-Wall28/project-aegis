import { VaultQuickView } from '@/components/dashboard/widgets/VaultQuickView';
import { GPASnapshot } from '@/components/dashboard/widgets/GPASnapshot';
import { LiveActivityWidget } from '@/components/dashboard/widgets/LiveActivityWidget';
import { Box, Grid } from '@mui/material';
import { motion } from 'framer-motion';

export function Dashboard() {
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

                        {/* Live Activity Widget */}
                        <Grid size={12} sx={{ flex: 1 }}>
                            <Box component={motion.div} variants={itemVariants} sx={{ height: '100%' }}>
                                <LiveActivityWidget />
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>

            </Grid>
        </Box>
    );
}

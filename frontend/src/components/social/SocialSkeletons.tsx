import { Box, Paper, Skeleton, alpha, useTheme } from '@mui/material';

// Skeleton for Collections
export const CollectionSkeleton = () => {
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: '10px',
        }}>
            <Skeleton variant="circular" width={18} height={18} />
            <Skeleton variant="text" width="70%" height={24} />
        </Box>
    );
};

// Skeleton for Link Cards
export const LinkCardSkeleton = () => {
    const theme = useTheme();
    return (
        <Paper
            variant="glass"
            sx={{
                borderRadius: '24px',
                height: 280,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
            }}
        >
            <Skeleton variant="rectangular" height={140} />
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Skeleton variant="text" width="90%" height={28} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="60%" height={20} />
                <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton variant="text" width="30%" height={16} />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Skeleton variant="circular" width={24} height={24} />
                        <Skeleton variant="circular" width={24} height={24} />
                        <Skeleton variant="circular" width={24} height={24} />
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

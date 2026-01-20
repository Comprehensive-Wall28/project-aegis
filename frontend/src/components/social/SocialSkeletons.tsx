import { Box, Paper, Skeleton, alpha, useTheme } from '@mui/material';
import {
    SOCIAL_LINK_CARD_HEIGHT,
    SOCIAL_LINK_PREVIEW_HEIGHT,
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_XSMALL
} from './constants';

// Skeleton for Collections
export const CollectionSkeleton = () => {
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: SOCIAL_RADIUS_XSMALL,
        }}>
            <Skeleton variant="circular" width={18} height={18} animation={false} />
            <Skeleton variant="text" width="70%" height={24} animation={false} />
        </Box>
    );
};

// Skeleton for Link Cards
export const LinkCardSkeleton = () => {
    const theme = useTheme();
    return (
        <Box sx={{
            height: SOCIAL_LINK_CARD_HEIGHT,
            padding: '3px',
            boxSizing: 'border-box'
        }}>
            <Paper
                elevation={1}
                sx={{
                    borderRadius: SOCIAL_RADIUS_XLARGE,
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                    boxShadow: 'none',
                }}
            >
                <Skeleton variant="rectangular" height={SOCIAL_LINK_PREVIEW_HEIGHT} animation={false} />
                <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Skeleton variant="text" width="90%" height={28} sx={{ mb: 1 }} animation={false} />
                    <Skeleton variant="text" width="60%" height={20} animation={false} />
                    <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Skeleton variant="text" width="30%" height={16} animation={false} />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Skeleton variant="circular" width={24} height={24} animation={false} />
                            <Skeleton variant="circular" width={24} height={24} animation={false} />
                            <Skeleton variant="circular" width={24} height={24} animation={false} />
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

import { memo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Diversity3 as GroupIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

export const RoomsEmptyState = memo(() => {
    const theme = useTheme();

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                p: 2,
                gap: 2,
                height: '100%',
            }}
        >
            <Box
                sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '40px',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: -10,
                        borderRadius: '50px',
                        border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                        animation: 'spin 20s linear infinite',
                    },
                    '@keyframes spin': {
                        from: { transform: 'rotate(0deg)' },
                        to: { transform: 'rotate(360deg)' },
                    }
                }}
            >
                <GroupIcon sx={{ fontSize: 60, color: 'primary.main' }} />
            </Box>

            <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    No Social Rooms Yet
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
                    End-to-end encryption protects your room metadata, comments, and annotations.
                    Securely share links and collaborate while keeping your discussions private.
                </Typography>
            </Box>
        </Box>
    );
});

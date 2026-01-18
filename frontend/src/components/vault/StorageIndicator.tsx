import { useEffect } from 'react';
import { Box, Typography, LinearProgress, useTheme, alpha } from '@mui/material';
import { useSessionStore } from '@/stores/sessionStore';

const MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB

export const StorageIndicator = () => {
    const theme = useTheme();
    const { user, fetchStorageStats } = useSessionStore();
    const totalUsed = user?.totalStorageUsed || 0;

    useEffect(() => {
        fetchStorageStats();
    }, [fetchStorageStats]);

    const progress = Math.min((totalUsed / MAX_STORAGE) * 100, 100);

    // Color based on usage
    const getProgressColor = () => {
        if (progress > 90) return theme.palette.error.main;
        if (progress > 75) return theme.palette.warning.main;
        return theme.palette.primary.main;
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                minWidth: 140,
                opacity: 0.9,
                '&:hover': { opacity: 1 }
            }}
        >
            <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            fontSize: '0.6rem',
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            opacity: 0.8
                        }}
                    >
                        Vault Space
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 800,
                            fontSize: '0.65rem',
                            color: getProgressColor(),
                            letterSpacing: '0.5px'
                        }}
                    >
                        {progress.toFixed(0)}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 3,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.divider, 0.08),
                        '& .MuiLinearProgress-bar': {
                            bgcolor: getProgressColor(),
                            borderRadius: 1.5,
                            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: `0 0 6px ${alpha(getProgressColor(), 0.3)}`
                        }
                    }}
                />
            </Box>
        </Box>
    );
};

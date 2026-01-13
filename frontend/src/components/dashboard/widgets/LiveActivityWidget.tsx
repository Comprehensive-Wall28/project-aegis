import { useEffect } from 'react';
import { Box, Paper, Typography, alpha, useTheme, Button } from '@mui/material';
import { History as HistoryIcon, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { ActivityItem } from '@/components/security/ActivityItem';

export function LiveActivityWidget() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { recentActivity, fetchRecentActivity, isAuthenticated } = useSessionStore();

    useEffect(() => {
        if (isAuthenticated) {
            fetchRecentActivity();
        }
    }, [isAuthenticated, fetchRecentActivity]);

    const sharedPaperStyles = {
        p: 2.5,
        height: '100%',
        borderRadius: '16px',
        bgcolor: alpha(theme.palette.background.paper, 0.4),
        backdropFilter: 'blur(12px)',
        border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        '&:hover': {
            borderColor: alpha(theme.palette.common.white, 0.1),
            boxShadow: '0 8px 32px -2px rgba(0, 0, 0, 0.3)',
        }
    };

    const handleViewAll = () => {
        navigate('/settings', { state: { activeTab: 2 } }); // Navigate to Activity tab
    };

    return (
        <Paper sx={sharedPaperStyles}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, px: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon size={14} style={{ color: theme.palette.primary.main }} />
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 800,
                            color: 'text.secondary',
                            letterSpacing: '0.1em',
                            fontSize: '10px'
                        }}
                    >
                        LIVE ACTIVITY
                    </Typography>
                </Box>
                <Button
                    variant="text"
                    size="small"
                    onClick={handleViewAll}
                    endIcon={<ArrowUpRight size={12} />}
                    sx={{
                        textTransform: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'text.secondary',
                        minWidth: 'auto',
                        p: 0.5,
                        '&:hover': {
                            color: theme.palette.primary.main,
                            bgcolor: 'transparent',
                        }
                    }}
                >
                    View All
                </Button>
            </Box>

            {/* Activity List */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto' }}>
                {recentActivity.length === 0 ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                            No recent activity
                        </Typography>
                    </Box>
                ) : (
                    recentActivity.map((log, index) => (
                        <motion.div
                            key={log._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <ActivityItem log={log} variant="compact" />
                        </motion.div>
                    ))
                )}
            </Box>
        </Paper>
    );
}

export default LiveActivityWidget;

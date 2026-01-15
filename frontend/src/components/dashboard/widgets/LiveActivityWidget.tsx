import { useEffect, useMemo, memo } from 'react';
import { Box, Paper, Typography, useTheme, Button } from '@mui/material';
import { History as HistoryIcon, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { ActivityItem } from '@/components/security/ActivityItem';

const MemoizedActivityItem = memo(ActivityItem);

export function LiveActivityWidget() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { recentActivity, fetchRecentActivity, isAuthenticated } = useSessionStore();

    useEffect(() => {
        if (isAuthenticated) {
            fetchRecentActivity();
        }
    }, [isAuthenticated, fetchRecentActivity]);

    const paperStyles = useMemo(() => ({
        p: 2.5,
        height: '100%',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        contain: 'content',
        transition: 'none',
        bgcolor: theme.palette.background.paper, // Force opaque
        backgroundImage: 'none', // Ensure no gradient
        backdropFilter: 'none', // Disable blur
        border: `1px solid ${theme.palette.divider}`,
    }), [theme]);

    const handleViewAll = () => {
        navigate('/dashboard/security?tab=activity', { state: { activeTab: 3 } });
    };

    return (
        <Paper
            variant="solid"
            sx={paperStyles}
            elevation={0}
        >
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
                    recentActivity.map((log) => (
                        <MemoizedActivityItem key={log._id} log={log} variant="compact" />
                    ))
                )}
            </Box>
        </Paper>
    );
}

export default LiveActivityWidget;

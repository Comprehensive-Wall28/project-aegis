import { useMemo, memo } from 'react';
import { Box, Typography, useTheme, Button, alpha, Skeleton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// ... inside LiveActivityWidget ...
import { DashboardCard } from '@/components/common/DashboardCard';
import { History as HistoryIcon, ArrowUpRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { ActivityItem } from '@/components/security/ActivityItem';
import dayjs from 'dayjs';
import type { DecryptedTask } from '@/stores/useTaskStore';
import { useTaskEncryption } from '@/hooks/useTaskEncryption';

const MemoizedActivityItem = memo(ActivityItem);

// Reusing style from ActivityItem for consistency
const TaskItem = memo(({ task }: { task: DecryptedTask }) => {
    const theme = useTheme();
    const isOverdue = dayjs(task.dueDate).isBefore(dayjs());
    const isToday = dayjs(task.dueDate).isSame(dayjs(), 'day');

    const daysUntil = dayjs(task.dueDate).startOf('day').diff(dayjs().startOf('day'), 'day');

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: '24px',
                bgcolor: alpha(theme.palette.background.paper, 0.3),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, // Distinct border for tasks
                transition: 'all 0.2s ease',
                '&:hover': {
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                    borderColor: alpha(theme.palette.primary.main, 0.4),
                }
            }}
        >
            <Box
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.palette.primary.main,
                    flexShrink: 0,
                }}
            >
                <Calendar size={16} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {task.title}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        color: isOverdue ? 'error.main' : isToday ? 'warning.main' : 'text.secondary',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontWeight: (isOverdue || isToday) ? 600 : 400
                    }}
                >
                    Due {dayjs(task.dueDate).format('MMM D, h:mm A')}
                    {isOverdue && ' (Overdue)'}
                    {isToday && ' (Today)'}
                    {!isOverdue && !isToday && daysUntil === 1 && ' (Tomorrow)'}
                    {!isOverdue && !isToday && daysUntil > 1 && ` (in ${daysUntil} days)`}
                </Typography>
            </Box>
        </Box>
    );
});

import { useQuery } from '@tanstack/react-query';
import activityService from '@/services/activityService';

export function LiveActivityWidget() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSessionStore();
    const userId = user?._id;
    // Removed tasks store usage as we fetch combined data now

    const { data: activityData, isLoading: isFetching } = useQuery({
        queryKey: ['dashboardActivity', userId],
        queryFn: () => activityService.getDashboardActivity(),
        enabled: isAuthenticated && !!userId,
        staleTime: 1000 * 60, // 1 minute stale time
    });

    const { decryptTasks } = useTaskEncryption();

    // Use a separate query for decryption to cache the result and avoid re-decrypting on remount
    const { data: decryptedTasks = [], isLoading: isDecrypting } = useQuery({
        queryKey: ['decryptedDashboardTasks', userId, activityData?.tasks],
        queryFn: async () => {
            if (!activityData?.tasks || activityData.tasks.length === 0) return [];

            try {
                const result = await decryptTasks(activityData.tasks);
                if (Array.isArray(result)) {
                    return result;
                } else {
                    return result.tasks;
                }
            } catch (err) {
                console.error('Failed to decrypt dashboard tasks:', err);
                return [];
            }
        },
        enabled: !!activityData?.tasks && activityData.tasks.length > 0,
        staleTime: Infinity, // Keep decrypted data as long as the input data hasn't changed (queryKey dependency handles updates)
        gcTime: 1000 * 60 * 5, // Keep in garbage collection for 5 mins
    });

    const combinedItems = useMemo(() => {
        if (!activityData) return { tasks: [], activities: [] };

        return {
            tasks: decryptedTasks,
            activities: activityData.activities || []
        };
    }, [activityData, decryptedTasks]);

    const handleViewAll = () => {
        if (combinedItems.tasks.length > 0) {
            navigate('/dashboard/tasks');
        } else {
            navigate('/dashboard/security?tab=activity', { state: { activeTab: 3 } });
        }
    };

    const showLoading = isFetching || (isDecrypting && activityData?.tasks && activityData.tasks.length > 0);

    return (
        <DashboardCard
            sx={{
                p: { xs: 2, sm: 2.5 },
                transition: 'none',
                bgcolor: theme.palette.background.paper, // Force opaque
                backgroundImage: 'none', // Ensure no gradient
                backdropFilter: 'none', // Disable blur
                height: '293px',
                display: 'flex',
                flexDirection: 'column',
            }}
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



            {/* Content List */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {showLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {[1, 2, 3].map((i) => (
                                    <Box key={i} sx={{ display: 'flex', gap: 2, p: 1.5 }}>
                                        <Skeleton variant="rounded" width={32} height={32} animation="wave" />
                                        <Box sx={{ flex: 1 }}>
                                            <Skeleton variant="text" width="60%" height={20} animation="wave" />
                                            <Skeleton variant="text" width="40%" height={16} animation="wave" />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </motion.div>
                    ) : (combinedItems.tasks.length === 0 && combinedItems.activities.length === 0) ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                                    No recent activity
                                </Typography>
                            </Box>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {combinedItems.tasks.map(task => (
                                    <TaskItem key={task._id} task={task} />
                                ))}
                                {combinedItems.activities.map((log) => (
                                    <MemoizedActivityItem key={log._id} log={log} variant="compact" />
                                ))}
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </DashboardCard>
    );
}

export default LiveActivityWidget;

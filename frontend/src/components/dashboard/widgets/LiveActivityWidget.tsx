import { useEffect, useMemo, memo, useRef } from 'react';
import { Box, Paper, Typography, useTheme, Button, alpha } from '@mui/material';
import { History as HistoryIcon, ArrowUpRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { ActivityItem } from '@/components/security/ActivityItem';
import dayjs from 'dayjs';
import type { DecryptedTask } from '@/stores/useTaskStore';

const MemoizedActivityItem = memo(ActivityItem);

// Reusing style from ActivityItem for consistency
const TaskItem = memo(({ task }: { task: DecryptedTask }) => {
    const theme = useTheme();
    const isOverdue = dayjs(task.dueDate).isBefore(dayjs());
    const isToday = dayjs(task.dueDate).isSame(dayjs(), 'day');

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: '12px',
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
                </Typography>
            </Box>
        </Box>
    );
});

export function LiveActivityWidget() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { recentActivity, fetchRecentActivity, isAuthenticated } = useSessionStore();
    const { tasks } = useTaskStore();
    const hasFetched = useRef(false);

    // Fetch activity (only once)
    useEffect(() => {
        if (isAuthenticated && !hasFetched.current) {
            hasFetched.current = true;
            fetchRecentActivity();
        }
    }, [isAuthenticated, fetchRecentActivity]);

    const upcomingTasks = useMemo(() => {
        if (!tasks || tasks.length === 0) return [];

        const now = dayjs();
        return tasks
            .filter(t => t.dueDate && t.status !== 'done' && (dayjs(t.dueDate).isAfter(now) || dayjs(t.dueDate).isSame(now, 'day')))
            .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
            .slice(0, 3); // Limit to top 3 upcoming tasks
    }, [tasks]);

    const combinedItems = useMemo(() => {
        const MAX_ITEMS = 3;
        // top 3 tasks
        const tasksToShow = upcomingTasks.slice(0, MAX_ITEMS);
        // fill remainder
        const remainingSlots = MAX_ITEMS - tasksToShow.length;
        const activitiesToShow = recentActivity.slice(0, remainingSlots);

        return { tasks: tasksToShow, activities: activitiesToShow };
    }, [upcomingTasks, recentActivity]);

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
        if (combinedItems.tasks.length > 0) {
            navigate('/dashboard/tasks');
        } else {
            navigate('/dashboard/security?tab=activity', { state: { activeTab: 3 } });
        }
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

            {/* Content List */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden' }}>

                {(combinedItems.tasks.length === 0 && combinedItems.activities.length === 0) ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                            No recent activity
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {combinedItems.tasks.map(task => (
                            <TaskItem key={task._id} task={task} />
                        ))}
                        {combinedItems.activities.map((log) => (
                            <MemoizedActivityItem key={log._id} log={log} variant="compact" />
                        ))}
                    </>
                )}
            </Box>
        </Paper>
    );
}

export default LiveActivityWidget;

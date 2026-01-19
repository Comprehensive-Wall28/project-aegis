import { Box, Typography, Paper, alpha, useTheme, Checkbox, Chip, IconButton } from '@mui/material';
import { Delete as DeleteIcon, AccessTime as DueDateIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { DecryptedTask } from '@/stores/useTaskStore';

interface TaskListProps {
    tasks: DecryptedTask[];
    onTaskClick: (task: DecryptedTask) => void;
    onStatusToggle: (taskId: string, currentStatus: string) => void;
    onDelete: (taskId: string) => void;
    groupBy?: 'status' | 'priority';
}

const PRIORITY_COLORS = {
    high: '#f44336',
    medium: '#ff9800',
    low: '#4caf50',
};

const STATUS_LABELS = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
};

const PRIORITY_LABELS = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.3 }
    },
    exit: {
        opacity: 0,
        x: 10,
        transition: { duration: 0.2 }
    }
};

export const TaskList = ({ tasks, onTaskClick, onStatusToggle, onDelete, groupBy = 'status' }: TaskListProps) => {
    const theme = useTheme();

    const groupedTasks = tasks.reduce((acc, task) => {
        const key = groupBy === 'status' ? task.status : task.priority;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {} as Record<string, DecryptedTask[]>);

    const groupOrder = groupBy === 'status'
        ? ['todo', 'in_progress', 'done']
        : ['high', 'medium', 'low'];

    const groupLabels = groupBy === 'status' ? STATUS_LABELS : PRIORITY_LABELS;

    const formatDueDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {groupOrder.map((groupKey) => {
                const groupTasks = groupedTasks[groupKey] || [];
                if (groupTasks.length === 0) return null;

                return (
                    <Box key={groupKey}>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontWeight: 700,
                                mb: 2,
                                color: theme.palette.text.secondary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontSize: '0.8rem',
                            }}
                        >
                            {groupLabels[groupKey as keyof typeof groupLabels]} ({groupTasks.length})
                        </Typography>
                        <Box
                            component={motion.div}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <AnimatePresence mode="popLayout">
                                {groupTasks.map((task) => (
                                    <Box
                                        key={task._id}
                                        component={motion.div}
                                        layout
                                        variants={itemVariants}
                                    >
                                        <Paper
                                            onClick={() => onTaskClick(task)}
                                            sx={{
                                                p: 2,
                                                mb: 1.5,
                                                borderRadius: '12px',
                                                bgcolor: alpha(theme.palette.background.paper, 0.8),
                                                border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                                                cursor: 'pointer',
                                                transition: 'border-color 0.2s ease, background-color 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                willChange: 'transform, opacity',
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.background.paper, 0.95),
                                                    borderColor: alpha(theme.palette.primary.main, 0.35),
                                                },
                                            }}
                                        >
                                            <Checkbox
                                                checked={task.status === 'done'}
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStatusToggle(task._id, task.status);
                                                }}
                                                sx={{
                                                    p: 0.5,
                                                    color: alpha(theme.palette.common.white, 0.45),
                                                    '&.Mui-checked': {
                                                        color: alpha('#4caf50', 0.7),
                                                    },
                                                    '&:hover': {
                                                        color: alpha(theme.palette.common.white, 0.4),
                                                    },
                                                    '& .MuiSvgIcon-root': {
                                                        fontSize: 18,
                                                    },
                                                }}
                                            />

                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        fontWeight: 600,
                                                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                                        opacity: task.status === 'done' ? 0.6 : 1,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {task.title}
                                                </Typography>
                                                {task.description && (
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            fontSize: '0.8rem',
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        {task.description}
                                                    </Typography>
                                                )}
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                                                {task.dueDate && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <DueDateIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatDueDate(task.dueDate)}
                                                        </Typography>
                                                    </Box>
                                                )}

                                                <Chip
                                                    label={task.priority.charAt(0).toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        minWidth: 28,
                                                        height: 22,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        bgcolor: alpha(PRIORITY_COLORS[task.priority], 0.25),
                                                        color: PRIORITY_COLORS[task.priority],
                                                    }}
                                                />

                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(task._id);
                                                    }}
                                                    sx={{
                                                        opacity: 0.5,
                                                        '&:hover': {
                                                            opacity: 1,
                                                            color: 'error.main',
                                                        },
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Paper>
                                    </Box>
                                ))}
                            </AnimatePresence>
                        </Box>
                    </Box>
                );
            })}

            {tasks.length === 0 && (
                <Box
                    sx={{
                        py: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.5,
                    }}
                >
                    <Typography variant="body1" color="text.secondary">
                        No tasks yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Create your first task to get started
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

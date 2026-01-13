import { Box, Typography, Paper, alpha, useTheme, Chip, IconButton } from '@mui/material';
import { Edit as EditIcon, AccessTime as DueDateIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface TaskCardProps {
    task: {
        _id: string;
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        dueDate?: string;
        status: 'todo' | 'in_progress' | 'done';
    };
    onClick: () => void;
    isDragging?: boolean;
}

const PRIORITY_COLORS = {
    high: '#f44336',
    medium: '#ff9800',
    low: '#4caf50',
};

const PRIORITY_LABELS = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

export const TaskCard = ({ task, onClick, isDragging }: TaskCardProps) => {
    const theme = useTheme();
    const priorityColor = PRIORITY_COLORS[task.priority];

    const formatDueDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: 'Overdue', color: '#f44336' };
        if (diffDays === 0) return { text: 'Today', color: '#ff9800' };
        if (diffDays === 1) return { text: 'Tomorrow', color: '#ff9800' };
        if (diffDays <= 7) return { text: `${diffDays} days`, color: theme.palette.text.secondary };

        return {
            text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            color: theme.palette.text.secondary
        };
    };

    const dueDateInfo = formatDueDate(task.dueDate);

    return (
        <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={onClick}
            sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: alpha(theme.palette.background.paper, isDragging ? 0.9 : 0.6),
                backdropFilter: 'blur(8px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isDragging
                    ? `0 20px 40px ${alpha(theme.palette.common.black, 0.3)}`
                    : `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    boxShadow: `0 8px 20px ${alpha(theme.palette.common.black, 0.15)}`,
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    bgcolor: priorityColor,
                    borderRadius: '4px 0 0 4px',
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        flex: 1,
                        pr: 1,
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        opacity: task.status === 'done' ? 0.7 : 1,
                    }}
                >
                    {task.title}
                </Typography>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    sx={{
                        opacity: 0.6,
                        '&:hover': { opacity: 1 }
                    }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Box>

            {task.description && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: '0.8rem',
                    }}
                >
                    {task.description}
                </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                    label={PRIORITY_LABELS[task.priority]}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        bgcolor: alpha(priorityColor, 0.15),
                        color: priorityColor,
                        border: `1px solid ${alpha(priorityColor, 0.3)}`,
                    }}
                />

                {dueDateInfo && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DueDateIcon sx={{ fontSize: 14, color: dueDateInfo.color }} />
                        <Typography
                            variant="caption"
                            sx={{
                                color: dueDateInfo.color,
                                fontWeight: 500,
                                fontSize: '0.7rem',
                            }}
                        >
                            {dueDateInfo.text}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
};

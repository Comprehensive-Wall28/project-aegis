import { useState, useCallback } from 'react';
import { Box, Typography, Paper, alpha, useTheme, Button, Badge } from '@mui/material';
import { Add as AddIcon, CheckCircle, Schedule, RadioButtonUnchecked } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCard } from './TaskCard';
import type { DecryptedTask } from '@/stores/useTaskStore';

interface Column {
    id: 'todo' | 'in_progress' | 'done';
    title: string;
    icon: React.ReactNode;
    color: string;
}

const COLUMNS: Column[] = [
    { id: 'todo', title: 'To Do', icon: <RadioButtonUnchecked />, color: '#607d8b' },
    { id: 'in_progress', title: 'In Progress', icon: <Schedule />, color: '#ff9800' },
    { id: 'done', title: 'Done', icon: <CheckCircle />, color: '#4caf50' },
];

interface KanbanBoardProps {
    tasks: DecryptedTask[];
    onTaskClick: (task: DecryptedTask) => void;
    onAddTask: (status: 'todo' | 'in_progress' | 'done') => void;
    onTaskMove: (taskId: string, newStatus: 'todo' | 'in_progress' | 'done', newOrder: number) => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const columnVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4 }
    }
};

export const KanbanBoard = ({ tasks, onTaskClick, onAddTask, onTaskMove }: KanbanBoardProps) => {
    const theme = useTheme();
    const [draggedTask, setDraggedTask] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    const getTasksByStatus = useCallback((status: string) => {
        return tasks
            .filter(t => t.status === status)
            .sort((a, b) => a.order - b.order);
    }, [tasks]);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
        setDraggedTask(taskId);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnId);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent, columnId: 'todo' | 'in_progress' | 'done') => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');

        if (taskId) {
            const columnTasks = getTasksByStatus(columnId);
            const newOrder = columnTasks.length;
            onTaskMove(taskId, columnId, newOrder);
        }

        setDraggedTask(null);
        setDragOverColumn(null);
    };

    const handleDragEnd = () => {
        setDraggedTask(null);
        setDragOverColumn(null);
    };

    return (
        <Box
            component={motion.div}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 3,
                flex: 1,
                minHeight: 0, // Allow shrinking if needed
                height: '100%',
            }}
        >
            {COLUMNS.map((column) => {
                const columnTasks = getTasksByStatus(column.id);
                const isOver = dragOverColumn === column.id;

                return (
                    <Box
                        key={column.id}
                        component={motion.div}
                        variants={columnVariants}
                        sx={{ height: '100%' }}
                    >
                        <Paper
                            onDragOver={(e: any) => handleDragOver(e, column.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e: any) => handleDrop(e, column.id)}
                            sx={{
                                p: 2,
                                borderRadius: '20px',
                                bgcolor: alpha(theme.palette.background.paper, isOver ? 0.7 : 0.5),
                                border: `2px dashed ${isOver
                                    ? alpha(column.color, 0.5)
                                    : alpha(theme.palette.common.white, 0.15)}`,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: { xs: 200, md: 250 },
                                height: '100%',
                            }}
                        >
                            {/* Column Header */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 2,
                                    pb: 2,
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 36,
                                            height: 36,
                                            borderRadius: '10px',
                                            bgcolor: alpha(column.color, 0.15),
                                            color: column.color,
                                        }}
                                    >
                                        {column.icon}
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                                        {column.title}
                                    </Typography>
                                    <Badge
                                        badgeContent={columnTasks.length}
                                        sx={{
                                            '& .MuiBadge-badge': {
                                                bgcolor: alpha(column.color, 0.3),
                                                color: column.color,
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                            },
                                        }}
                                    />
                                </Box>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={(e) => {
                                        e.currentTarget.blur();
                                        onAddTask(column.id);
                                    }}
                                    sx={{
                                        minWidth: 0,
                                        px: 1.5,
                                        borderRadius: '10px',
                                        textTransform: 'none',
                                        fontSize: '0.75rem',
                                        bgcolor: alpha(theme.palette.common.white, 0.15),
                                        '&:hover': {
                                            bgcolor: alpha(column.color, 0.15),
                                        },
                                    }}
                                >
                                    Add
                                </Button>
                            </Box>

                            {/* Task List */}
                            <Box
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5,
                                    overflowY: 'auto',
                                    pr: 0.5,
                                    '&::-webkit-scrollbar': {
                                        width: 4,
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        bgcolor: 'transparent',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        bgcolor: alpha(theme.palette.common.white, 0.25),
                                        borderRadius: 2,
                                    },
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {columnTasks.map((task) => (
                                        <Box
                                            key={task._id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task._id)}
                                            onDragEnd={handleDragEnd}
                                            sx={{
                                                opacity: draggedTask === task._id ? 0.5 : 1,
                                                transition: 'opacity 0.2s ease',
                                            }}
                                        >
                                            <TaskCard
                                                task={task}
                                                onClick={() => onTaskClick(task)}
                                                isDragging={draggedTask === task._id}
                                            />
                                        </Box>
                                    ))}
                                </AnimatePresence>

                                {columnTasks.length === 0 && (
                                    <Box
                                        sx={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            py: 4,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ opacity: 0.5, fontStyle: 'italic' }}
                                        >
                                            Drop tasks here
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                );
            })}
        </Box>
    );
};

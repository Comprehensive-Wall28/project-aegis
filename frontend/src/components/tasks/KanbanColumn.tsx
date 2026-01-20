import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Paper, Typography, Button, Badge, alpha, useTheme } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { AnimatePresence } from 'framer-motion';
import { SortableTaskItem } from './SortableTaskItem';
import type { DecryptedTask } from '@/stores/useTaskStore';

interface KanbanColumnProps {
    id: 'todo' | 'in_progress' | 'done';
    title: string;
    icon: React.ReactNode;
    color: string;
    tasks: DecryptedTask[];
    onTaskClick: (task: DecryptedTask) => void;
    onAddTask: (status: 'todo' | 'in_progress' | 'done') => void;
}

const KanbanColumnComponent = ({
    id,
    title,
    icon,
    color,
    tasks,
    onTaskClick,
    onAddTask,
}: KanbanColumnProps) => {
    const theme = useTheme();
    // Column is a droppable zone (mostly for empty columns or appending)
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { type: 'Column', columnId: id }
    });

    const taskIds = useMemo(() => tasks.map(t => t._id), [tasks]);

    return (
        <Box sx={{ height: '100%' }}>
            <Paper
                ref={setNodeRef}
                sx={{
                    p: 2,
                    borderRadius: '20px',
                    bgcolor: alpha(theme.palette.background.paper, isOver ? 0.7 : 0.5),
                    border: `2px dashed ${isOver
                        ? alpha(color, 0.5)
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
                                bgcolor: alpha(color, 0.15),
                                color: color,
                            }}
                        >
                            {icon}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {title}
                        </Typography>
                        <Badge
                            badgeContent={tasks.length}
                            sx={{
                                '& .MuiBadge-badge': {
                                    bgcolor: alpha(color, 0.3),
                                    color: color,
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
                            onAddTask(id);
                        }}
                        sx={{
                            minWidth: 0,
                            px: 1.5,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            bgcolor: alpha(theme.palette.common.white, 0.15),
                            '&:hover': {
                                bgcolor: alpha(color, 0.15),
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
                    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        <AnimatePresence mode="popLayout">
                            {tasks.map((task) => (
                                <SortableTaskItem
                                    key={task._id}
                                    task={task}
                                    onTaskClick={onTaskClick}
                                />
                            ))}
                        </AnimatePresence>
                    </SortableContext>

                    {tasks.length === 0 && (
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
};

export const KanbanColumn = React.memo(KanbanColumnComponent);

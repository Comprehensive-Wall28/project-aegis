import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Paper, Typography, Button, Badge, alpha, useTheme, styled } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Virtuoso } from 'react-virtuoso';
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
    isOverParent?: boolean;
}

const StyledVirtuoso = styled(Virtuoso)(({ theme }) => ({
    '&::-webkit-scrollbar': {
        width: 4,
    },
    '&::-webkit-scrollbar-track': {
        bgcolor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: alpha(theme.palette.common.white, 0.25),
        borderRadius: 2,
    },
})) as typeof Virtuoso;

const KanbanColumnComponent = ({
    id,
    title,
    icon,
    color,
    tasks,
    onTaskClick,
    onAddTask,
    isOverParent,
}: KanbanColumnProps) => {
    const theme = useTheme();
    // Column is a droppable zone (mostly for empty columns or appending)
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { type: 'Column', columnId: id }
    });

    const activeOver = isOver || isOverParent;

    const taskIds = useMemo(() => tasks.map(t => t._id), [tasks]);

    return (
        <Box sx={{ height: '100%' }}>
            <Paper
                ref={setNodeRef}
                sx={{
                    p: 1.5,
                    borderRadius: '20px',
                    bgcolor: alpha(theme.palette.background.paper, activeOver ? 0.7 : 0.5),
                    border: `2px dashed ${activeOver
                        ? alpha(color, 0.5)
                        : alpha(theme.palette.text.primary, 0.12)}`,
                    transition: 'background-color 0.2s ease, border-color 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: { xs: 350, md: 450 },
                    height: '100%',
                }}
            >
                {/* Column Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1.5,
                        pb: 1.5,
                        borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
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
                            bgcolor: alpha(theme.palette.common.white, 0.1),
                            '&:hover': {
                                bgcolor: alpha(color, 0.15),
                            },
                        }}
                    >
                        Add
                    </Button>
                </Box>

                {/* Task List */}
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    {tasks.length > 0 ? (
                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                            <StyledVirtuoso
                                data={tasks}
                                itemContent={(_index, task: DecryptedTask) => (
                                    <Box sx={{ pb: 1.5, px: 0.5 }}>
                                        <SortableTaskItem
                                            key={task._id}
                                            task={task}
                                            onTaskClick={onTaskClick}
                                        />
                                    </Box>
                                )}
                                style={{ height: '100%' }}
                            />
                        </SortableContext>
                    ) : (
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
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

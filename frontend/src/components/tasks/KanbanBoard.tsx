import { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import {
    CheckCircle,
    Schedule,
    RadioButtonUnchecked,
} from '@mui/icons-material';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    TouchSensor,
    MouseSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    defaultDropAnimationSideEffects,
    type DropAnimation,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';

import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import type { DecryptedTask } from '@/stores/useTaskStore';
import { TASK_COLUMNS_CONFIG, TASK_STATUS, TASK_PRIORITY } from '@/constants/taskDefaults';

export type SortMode = 'manual' | 'priority' | 'date';

interface KanbanBoardProps {
    tasks: DecryptedTask[];
    onTaskClick: (task: DecryptedTask) => void;
    onAddTask: (status: 'todo' | 'in_progress' | 'done') => void;
    onTaskMove: (updates: { id: string; status: string; order: number }[]) => void;
    sortMode: SortMode;
}

const PRIORITY_VALUE = {
    [TASK_PRIORITY.HIGH]: 3,
    [TASK_PRIORITY.MEDIUM]: 2,
    [TASK_PRIORITY.LOW]: 1,
};

const COLUMN_ICONS = {
    [TASK_STATUS.TODO]: <RadioButtonUnchecked />,
    [TASK_STATUS.IN_PROGRESS]: <Schedule />,
    [TASK_STATUS.DONE]: <CheckCircle />,
};

const ALL_COLUMNS = TASK_COLUMNS_CONFIG.map(col => ({
    ...col,
    icon: COLUMN_ICONS[col.id],
}));

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

export const KanbanBoard = ({ tasks, onTaskClick, onAddTask, onTaskMove, sortMode }: KanbanBoardProps) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, DecryptedTask[]> = {
            [TASK_STATUS.TODO]: [],
            [TASK_STATUS.IN_PROGRESS]: [],
            [TASK_STATUS.DONE]: [],
        };

        tasks.forEach(t => {
            if (grouped[t.status]) {
                grouped[t.status].push(t);
            }
        });

        // Sort each group based on current sortMode
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => {
                if (sortMode === 'priority') {
                    const valA = PRIORITY_VALUE[a.priority as keyof typeof PRIORITY_VALUE] || 0;
                    const valB = PRIORITY_VALUE[b.priority as keyof typeof PRIORITY_VALUE] || 0;
                    if (valA !== valB) return valB - valA; // High priority first
                    return a.order - b.order; // Then by order
                }

                if (sortMode === 'date') {
                    if (!a.dueDate && !b.dueDate) return a.order - b.order;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    const timeA = new Date(a.dueDate).getTime();
                    const timeB = new Date(b.dueDate).getTime();
                    if (timeA !== timeB) return timeA - timeB; // Soonest first
                    return a.order - b.order;
                }

                // Default: Manual (by order)
                return a.order - b.order;
            });
        });

        return grouped;
    }, [tasks, sortMode]);

    const activeTask = useMemo(() =>
        tasks.find(t => t._id === activeId),
        [tasks, activeId]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
    };

    const handleDragOver = () => {
        // Handled by SortableContext
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const taskId = active.id as string;

        setActiveId(null);

        if (!over) return;

        const overId = over.id as string;
        const activeTask = tasks.find(t => t._id === taskId);
        if (!activeTask) return;

        const sourceStatus = activeTask.status;
        let targetStatus = sourceStatus;

        // Determine target status
        if (Object.values(TASK_STATUS).includes(overId as any)) {
            targetStatus = overId as any;
        } else {
            const overTask = tasks.find(t => t._id === overId);
            if (overTask) targetStatus = overTask.status;
        }

        const sourceColTasks = tasksByStatus[sourceStatus];
        const targetColTasks = tasksByStatus[targetStatus];

        if (sourceStatus === targetStatus) {
            // Same column reorder
            if (sortMode !== 'manual') return;

            const oldIndex = sourceColTasks.findIndex(t => t._id === taskId);
            const newIndex = sourceColTasks.findIndex(t => t._id === overId);

            if (oldIndex !== newIndex && newIndex !== -1) {
                const reordered = arrayMove(sourceColTasks, oldIndex, newIndex);
                const updates = reordered.map((t, idx) => ({
                    id: t._id,
                    status: targetStatus,
                    order: idx
                }));
                onTaskMove(updates);
            }
        } else {
            // Cross column drop
            const overIndex = targetColTasks.findIndex(t => t._id === overId);
            const finalIndex = overIndex === -1 ? targetColTasks.length : overIndex;

            // When moving cross-column, we should at least update the moved task's status and order.
            // In a perfectly managed manual board, we'd update all tasks in target column too.
            const newTargetCol = [...targetColTasks];
            newTargetCol.splice(finalIndex, 0, { ...activeTask, status: targetStatus });

            const updates = newTargetCol.map((t, idx) => ({
                id: t._id,
                status: targetStatus,
                order: idx
            }));

            onTaskMove(updates);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                        gap: 3,
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    {ALL_COLUMNS.map((column) => (
                        <Box
                            key={column.id}
                            component={motion.div}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            sx={{ height: '100%' }}
                        >
                            <KanbanColumn
                                id={column.id}
                                title={column.title}
                                icon={column.icon}
                                color={column.color}
                                tasks={tasksByStatus[column.id] || []}
                                onTaskClick={onTaskClick}
                                onAddTask={onAddTask}
                            />
                        </Box>
                    ))}
                </Box>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? (
                        <TaskCard
                            task={activeTask}
                            onClick={() => { }}
                            isDragging={true}
                        />
                    ) : null}
                </DragOverlay>
            </Box>
        </DndContext>
    );
};

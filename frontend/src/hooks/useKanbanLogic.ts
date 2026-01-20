import { useState, useMemo } from 'react';
import {
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { TASK_STATUS } from '@/constants/taskDefaults';
import type { DecryptedTask } from '@/stores/useTaskStore';
import { useGroupedTasks } from '@/hooks/useGroupedTasks';
import type { SortMode } from '@/components/tasks/KanbanBoard';

interface UseKanbanLogicProps {
    tasks: DecryptedTask[];
    sortMode: SortMode;
    isDragDisabled?: boolean;
    onTaskMove: (updates: { id: string; status: string; order: number }[]) => void;
}

export const useKanbanLogic = ({
    tasks,
    sortMode,
    isDragDisabled = false,
    onTaskMove,
}: UseKanbanLogicProps) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const mouseSensorOptions = useMemo(() => ({
        activationConstraint: {
            distance: isDragDisabled ? 100000 : 5,
        },
    }), [isDragDisabled]);

    const touchSensorOptions = useMemo(() => ({
        activationConstraint: {
            delay: isDragDisabled ? 100000 : 200,
            tolerance: 5,
        },
    }), [isDragDisabled]);

    const keyboardSensorOptions = useMemo(() => ({
        coordinateGetter: sortableKeyboardCoordinates,
        keyboardCodes: isDragDisabled ? {
            start: [],
            cancel: [],
            end: [],
        } : undefined,
    }), [isDragDisabled]);

    const sensors = useSensors(
        useSensor(MouseSensor, mouseSensorOptions),
        useSensor(TouchSensor, touchSensorOptions),
        useSensor(KeyboardSensor, keyboardSensorOptions)
    );

    const tasksByStatus = useGroupedTasks(tasks, sortMode);

    const activeTask = useMemo(() =>
        tasks.find(t => t._id === activeId),
        [tasks, activeId]);

    const handleDragStart = (event: DragStartEvent) => {
        if (isDragDisabled) return;
        const { active } = event;
        setActiveId(active.id as string);
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
                const updates = reordered
                    .map((t, idx) => ({
                        id: t._id,
                        status: targetStatus,
                        order: idx
                    }))
                    .filter(u => {
                        const task = tasks.find(t => t._id === u.id);
                        return task ? (task.order !== u.order || task.status !== u.status) : true;
                    });

                if (updates.length > 0) {
                    onTaskMove(updates);
                }
            }
        } else {
            // Cross column drop
            const overIndex = targetColTasks.findIndex(t => t._id === overId);
            const finalIndex = overIndex === -1 ? targetColTasks.length : overIndex;

            const newTargetCol = [...targetColTasks];
            newTargetCol.splice(finalIndex, 0, { ...activeTask, status: targetStatus });

            const updates = newTargetCol
                .map((t, idx) => ({
                    id: t._id,
                    status: targetStatus,
                    order: idx
                }))
                .filter(u => {
                    const task = tasks.find(t => t._id === u.id);
                    return task ? (task.order !== u.order || task.status !== u.status) : true;
                });

            if (updates.length > 0) {
                onTaskMove(updates);
            }
        }
    };

    return {
        sensors,
        activeId,
        activeTask,
        tasksByStatus,
        handleDragStart,
        handleDragEnd,
    };
};

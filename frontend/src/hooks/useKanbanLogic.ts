import { useState, useMemo, useCallback, useRef } from 'react';
import {
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    type DragStartEvent,
    type DragOverEvent,
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
    onDeleteTask?: (id: string) => void;
}

export const useKanbanLogic = ({
    tasks,
    sortMode,
    isDragDisabled = false,
    onTaskMove,
    onDeleteTask,
}: UseKanbanLogicProps) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overColumnId, setOverColumnIdState] = useState<string | null>(null);
    const overColumnIdRef = useRef<string | null>(null);

    const setOverColumnId = useCallback((id: string | null) => {
        if (overColumnIdRef.current !== id) {
            overColumnIdRef.current = id;
            setOverColumnIdState(id);
        }
    }, []);

    // Create maps for O(1) task lookup during drag
    const { tasksMap, tasksById } = useMemo(() => {
        const tMap = new Map<string, string>();
        const bId = new Map<string, DecryptedTask>();
        tasks.forEach(t => {
            tMap.set(t._id, t.status);
            bId.set(t._id, t);
        });
        return { tasksMap: tMap, tasksById: bId };
    }, [tasks]);

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
        activeId ? tasksById.get(activeId) : undefined,
        [tasksById, activeId]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        if (isDragDisabled) return;
        const { active } = event;
        setActiveId(active.id as string);
    }, [isDragDisabled]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setOverColumnId(null);
            return;
        }

        const overId = over.id as string;

        // Skip for delete zone
        if (overId === 'delete-zone') {
            setOverColumnId(null);
            return;
        }

        // Check if over a column
        if (Object.values(TASK_STATUS).includes(overId as string & typeof TASK_STATUS[keyof typeof TASK_STATUS])) {
            setOverColumnId(overId);
        } else {
            // Check if over a task, then get its column
            const status = tasksMap.get(overId);
            if (status) {
                setOverColumnId(status);
            }
        }
    }, [tasksMap, setOverColumnId]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        const taskId = active.id as string;

        setActiveId(null);
        setOverColumnId(null);

        if (!over) return;

        const overId = over.id as string;

        // Handle Delete Zone drop
        if (overId === 'delete-zone') {
            onDeleteTask?.(taskId);
            return;
        }

        const activeTask = tasksById.get(taskId);
        if (!activeTask) return;

        const sourceStatus = activeTask.status;
        let targetStatus: typeof sourceStatus = sourceStatus;

        // Determine target status
        if (Object.values(TASK_STATUS).includes(overId as string & typeof TASK_STATUS[keyof typeof TASK_STATUS])) {
            targetStatus = overId as typeof sourceStatus;
        } else {
            const status = tasksMap.get(overId);
            if (status) targetStatus = status as typeof sourceStatus;
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
                        const task = tasksById.get(u.id);
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
                    const task = tasksById.get(u.id);
                    return task ? (task.order !== u.order || task.status !== u.status) : true;
                });

            if (updates.length > 0) {
                onTaskMove(updates);
            }
        }
    }, [tasksMap, tasksById, tasksByStatus, sortMode, onTaskMove, onDeleteTask, setOverColumnId]);

    return {
        sensors,
        activeId,
        activeTask,
        overColumnId,
        tasksByStatus,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
    };
};

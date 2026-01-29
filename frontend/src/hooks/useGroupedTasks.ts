import { useMemo } from 'react';
import type { DecryptedTask } from '@/stores/useTaskStore';
import type { SortMode } from '@/components/tasks/KanbanBoard';
import { TASK_STATUS, TASK_PRIORITY } from '@/constants/taskDefaults';

const PRIORITY_VALUE = {
    [TASK_PRIORITY.HIGH]: 3,
    [TASK_PRIORITY.MEDIUM]: 2,
    [TASK_PRIORITY.LOW]: 1,
};

export const useGroupedTasks = (tasks: DecryptedTask[], sortMode: SortMode) => {
    return useMemo(() => {
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
};

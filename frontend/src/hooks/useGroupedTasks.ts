import { useMemo, useRef } from 'react';
import type { DecryptedTask } from '@/stores/useTaskStore';
import type { SortMode } from '@/components/tasks/KanbanBoard'; // Need to export SortMode if not already or redefine
import { TASK_STATUS, TASK_PRIORITY } from '@/constants/taskDefaults';

const PRIORITY_VALUE = {
    [TASK_PRIORITY.HIGH]: 3,
    [TASK_PRIORITY.MEDIUM]: 2,
    [TASK_PRIORITY.LOW]: 1,
};

function areArraysEqual(a: DecryptedTask[], b: DecryptedTask[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export const useGroupedTasks = (tasks: DecryptedTask[], sortMode: SortMode) => {
    const prevGroupedRef = useRef<Record<string, DecryptedTask[]>>({
        [TASK_STATUS.TODO]: [],
        [TASK_STATUS.IN_PROGRESS]: [],
        [TASK_STATUS.DONE]: [],
    });

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

        // Stabilize references
        const prev = prevGroupedRef.current;
        const finalGrouped: Record<string, DecryptedTask[]> = {};
        let hasChanges = false;

        Object.keys(grouped).forEach(key => {
            if (prev[key] && areArraysEqual(prev[key], grouped[key])) {
                finalGrouped[key] = prev[key];
            } else {
                finalGrouped[key] = grouped[key];
                hasChanges = true;
            }
        });

        // If structure changed (shouldn't really happen for keys, but for safety)
        if (hasChanges) {
            prevGroupedRef.current = finalGrouped;
        }

        return finalGrouped;
    }, [tasks, sortMode]);
};

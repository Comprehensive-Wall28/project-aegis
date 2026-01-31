import { useState, useEffect, useMemo } from 'react';
import { useTaskStore } from '@/stores/useTaskStore';
import { useCalendarStore } from '@/stores/useCalendarStore';
import apiClient from '@/services/api';

export interface Backlink {
    id: string;
    type: 'task' | 'event';
    title: string;
}

export const useBacklinks = (entityId: string) => {
    const { tasks } = useTaskStore();
    const { events } = useCalendarStore();
    const [backlinkIds, setBacklinkIds] = useState<{ id: string; type: 'task' | 'event' }[]>([]);

    useEffect(() => {
        if (!entityId) {
            // Don't call setState synchronously - let the component handle empty state naturally
            return;
        }

        const fetchBacklinks = async () => {
            try {
                const response = await apiClient.get<{ id: string; type: 'task' | 'event' }[]>(
                    `/mentions/backlinks?targetId=${entityId}`
                );
                setBacklinkIds(response.data);
            } catch (err) {
                console.error('Failed to fetch backlinks:', err);
                setBacklinkIds([]); // Set empty array on error
            }
        };

        fetchBacklinks();
    }, [entityId]);

    // Reset backlinks when entityId becomes empty
    const effectiveBacklinkIds = entityId ? backlinkIds : [];

    const backlinks = useMemo(() => {
        return effectiveBacklinkIds.map(bl => {
            if (bl.type === 'task') {
                const task = tasks.find(t => t._id === bl.id);
                return { ...bl, title: task?.title || 'Private Task' };
            } else {
                const event = events.find(e => e._id === bl.id);
                return { ...bl, title: event?.title || 'Private Event' };
            }
        });
    }, [effectiveBacklinkIds, tasks, events]);

    return backlinks;
};

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
            setBacklinkIds([]);
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
            }
        };

        fetchBacklinks();
    }, [entityId]);

    const backlinks = useMemo(() => {
        return backlinkIds.map(bl => {
            if (bl.type === 'task') {
                const task = tasks.find(t => t._id === bl.id);
                return { ...bl, title: task?.title || 'Private Task' };
            } else {
                const event = events.find(e => e._id === bl.id);
                return { ...bl, title: event?.title || 'Private Event' };
            }
        });
    }, [backlinkIds, tasks, events]);

    return backlinks;
};

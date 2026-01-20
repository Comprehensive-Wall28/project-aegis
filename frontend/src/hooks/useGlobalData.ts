import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useTaskEncryption } from '@/hooks/useTaskEncryption';

/**
 * Hook to handle lightweight global data hydration for the dashboard.
 * Only fetches upcoming tasks (for LiveActivityWidget) - pages fetch their own full data.
 */
export function useGlobalData() {
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    const fetchUpcomingTasks = useTaskStore((state) => state.fetchUpcomingTasks);
    const { decryptTasks } = useTaskEncryption();

    const hasHydrated = useRef(false);

    useEffect(() => {
        if (pqcEngineStatus === 'operational' && !hasHydrated.current) {
            hasHydrated.current = true;

            // Lightweight fetch: only upcoming tasks for dashboard widget
            fetchUpcomingTasks(10, decryptTasks).catch(err => {
                console.error('[GlobalData] Failed to fetch upcoming tasks:', err);
            });

            // Note: Full task list is fetched by TasksPage when visited
            // Note: Events are fetched by CalendarPage when visited
        }
    }, [pqcEngineStatus, fetchUpcomingTasks, decryptTasks]);
}


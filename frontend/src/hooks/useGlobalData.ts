import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { useTaskEncryption } from '@/hooks/useTaskEncryption';
import { useCalendarEncryption } from '@/hooks/useCalendarEncryption';

/**
 * Hook to handle global data hydration for the dashboard.
 * Fetches and decrypts tasks and events when the PQC engine is operational.
 */
export function useGlobalData() {
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    const fetchTasks = useTaskStore((state) => state.fetchTasks);
    const { decryptTasks } = useTaskEncryption();

    const fetchEvents = useCalendarStore((state) => state.fetchEvents);
    const { decryptEvents } = useCalendarEncryption();

    const hasHydrated = useRef(false);

    useEffect(() => {
        if (pqcEngineStatus === 'operational' && !hasHydrated.current) {
            hasHydrated.current = true;

            // Fetch Tasks
            fetchTasks(undefined, decryptTasks).catch(err => {
                console.error('[GlobalData] Failed to fetch tasks:', err);
            });

            // Fetch Events
            fetchEvents(undefined, undefined, decryptEvents).catch(err => {
                console.error('[GlobalData] Failed to fetch events:', err);
            });
        }
    }, [pqcEngineStatus, fetchTasks, decryptTasks, fetchEvents, decryptEvents]);
}

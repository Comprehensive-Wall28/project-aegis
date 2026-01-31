import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import activityService from '@/services/activityService';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to handle lightweight global data hydration for the dashboard.
 * Only fetches upcoming tasks (for LiveActivityWidget) - pages fetch their own full data.
 */
export function useGlobalData() {
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const queryClient = useQueryClient();

    const hasHydrated = useRef(false);

    useEffect(() => {
        if (pqcEngineStatus === 'operational' && !hasHydrated.current) {
            hasHydrated.current = true;

            // Prefetch dashboard activity for instant loading
            queryClient.prefetchQuery({
                queryKey: ['dashboardActivity'],
                queryFn: () => activityService.getDashboardActivity(),
                staleTime: 1000 * 60,
            }).catch(err => {
                console.error('[GlobalData] Failed to prefetch dashboard activity:', err);
            });

            // Note: Full task list is fetched by TasksPage when visited
            // Note: Events are fetched by CalendarPage when visited
        }
    }, [pqcEngineStatus, queryClient]);
}


import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const analyticsPages = [
    '/dashboard/analytics/performance',
    '/dashboard/analytics/audit',
    '/dashboard/analytics/logs',
];

export function useAnalyticsShortcut() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check for Ctrl+Shift+A (or Cmd+Shift+A on Mac)
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifierKey = isMac ? event.metaKey : event.ctrlKey;

            if (modifierKey && event.shiftKey && event.key.toLowerCase() === 'a') {
                event.preventDefault();
                
                // Check if currently on an analytics page
                const currentPath = location.pathname;
                const currentIndex = analyticsPages.indexOf(currentPath);
                
                if (currentIndex >= 0) {
                    // Cycle to next analytics page
                    const nextIndex = (currentIndex + 1) % analyticsPages.length;
                    navigate(analyticsPages[nextIndex]);
                } else {
                    // Not on analytics, go to performance
                    navigate('/dashboard/analytics/performance');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, location.pathname]);
}

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { FilesPage } from '@/pages/FilesPage';
import { GPAPage } from '@/pages/GPAPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { TasksPage } from '@/pages/TasksPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SocialPage } from '@/pages/SocialPage';
import { InviteLanding } from '@/pages/InviteLanding';
import { PqcLearn } from '@/pages/PqcLearn';
import { NotFound } from '@/pages/NotFound';
import { BackendDownPage } from '@/pages/BackendDown';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import { useThemeStore } from '@/stores/themeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useMemo, useEffect } from 'react';

// Placeholder pages for future implementation

function ZKPVerifier() {
    return (
        <div className="glass-card border-white/10 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">ZKP Verifier</h2>
            <p className="text-muted-foreground">Zero-Knowledge Proof verification interface coming soon...</p>
        </div>
    );
}

const router = createBrowserRouter([
    {
        path: '/',
        element: <Landing />,
    },
    {
        path: '/backend-down',
        element: <BackendDownPage />,
    },
    {
        path: '/pqc-learn',
        element: <PqcLearn />,
    },
    {
        path: '/invite/:code',
        element: <InviteLanding />,
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <DashboardLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <Dashboard />,
            },
            {
                path: 'files',
                element: <FilesPage />,
            },
            {
                path: 'gpa',
                element: <GPAPage />,
            },
            {
                path: 'zkp',
                element: <ZKPVerifier />,
            },
            {
                path: 'calendar',
                element: <CalendarPage />,
            },
            {
                path: 'tasks',
                element: <TasksPage />,
            },
            {
                path: 'security',
                element: <SettingsPage />,
            },
            {
                path: 'social',
                element: <SocialPage />,
            },
            {
                path: 'social/:roomId',
                element: <SocialPage />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFound />,
    },
]);

export function AppRouter() {
    const themeMode = useThemeStore((state) => state.theme);
    const theme = useMemo(() => getTheme(themeMode), [themeMode]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppInitializer />
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}

// Separate component to handle auth initialization

function AppInitializer() {
    const checkAuth = useSessionStore((state) => state.checkAuth);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return null;
}


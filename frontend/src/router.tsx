import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
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
import { PublicSharedFilePage } from '@/pages/PublicSharedFilePage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RouteErrorBoundary } from '@/components/error/RouteErrorBoundary';
import { BackendStatusProvider } from '@/contexts/BackendStatusContext';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import { useThemeStore } from '@/stores/themeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useMemo, useEffect } from 'react';

// Root layout that provides backend status context to all routes
function RootLayout() {
    return (
        <BackendStatusProvider>
            <Outlet />
        </BackendStatusProvider>
    );
}

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
        element: <RootLayout />,
        children: [
            {
                path: '/',
                element: <Landing />,
                errorElement: <RouteErrorBoundary />,
            },
            {
                path: '/backend-down',
                element: <BackendDownPage />,
            },
            {
                path: '/pqc-learn',
                element: <PqcLearn />,
                errorElement: <RouteErrorBoundary />,
            },
            {
                path: '/invite/:code',
                element: <InviteLanding />,
                errorElement: <RouteErrorBoundary />,
            },
            {
                path: '/share/view/:token',
                element: <PublicSharedFilePage />,
                errorElement: <RouteErrorBoundary />,
            },
            {
                path: '/dashboard',
                element: (
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                ),
                errorElement: <RouteErrorBoundary />,
                children: [
                    {
                        index: true,
                        element: <Dashboard />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'files',
                        element: <FilesPage />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'files/:folderId',
                        element: <FilesPage />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'gpa',
                        element: <GPAPage />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'zkp',
                        element: <ZKPVerifier />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'calendar',
                        element: <CalendarPage />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'tasks',
                        element: <TasksPage />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'security',
                        element: <SettingsPage />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'social',
                        element: <SocialPage />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'social/:roomId',
                        element: <SocialPage />,
                        errorElement: <RouteErrorBoundary />,
                    },
                ],
            },
            {
                path: '*',
                element: <NotFound />,
            },
        ],
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

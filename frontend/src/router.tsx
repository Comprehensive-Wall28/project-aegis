import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { lazy, Suspense, useMemo, useEffect } from 'react';
import { Box, CircularProgress, ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { FilesPage } from '@/pages/FilesPage';
import { TasksPage } from '@/pages/TasksPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { GPAPage } from '@/pages/GPAPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { SocialPage } from '@/pages/SocialPage';
import NotesPage from '@/pages/NotesPage';

// Lazy load page components
// const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
// const SocialPage = lazy(() => import('@/pages/SocialPage').then(m => ({ default: m.SocialPage })));
const InviteLanding = lazy(() => import('@/pages/InviteLanding').then(m => ({ default: m.InviteLanding })));
const PqcLearn = lazy(() => import('@/pages/PqcLearn').then(m => ({ default: m.PqcLearn })));
const NotFound = lazy(() => import('@/pages/NotFound').then(m => ({ default: m.NotFound })));
const BackendDownPage = lazy(() => import('@/pages/BackendDown').then(m => ({ default: m.BackendDownPage })));
const PublicSharedFilePage = lazy(() => import('@/pages/PublicSharedFilePage').then(m => ({ default: m.PublicSharedFilePage })));
const AnalyticsPerformancePage = lazy(() => import('@/pages/AnalyticsPerformancePage').then(m => ({ default: m.default })));
const AnalyticsAuditPage = lazy(() => import('@/pages/AnalyticsAuditPage').then(m => ({ default: m.default })));
const AnalyticsLogsPage = lazy(() => import('@/pages/AnalyticsLogsPage').then(m => ({ default: m.default })));
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RouteErrorBoundary } from '@/components/error/RouteErrorBoundary';
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary';
import { BackendStatusProvider } from '@/contexts/BackendStatusContext';
import { getTheme } from './theme';
import { useThemeStore } from '@/stores/themeStore';
import { useSessionStore } from '@/stores/sessionStore';

// Loading component for Suspense fallback
function PageLoader() {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                width: '100%',
            }}
        >
            <CircularProgress size={40} thickness={4} sx={{ color: 'primary.main' }} />
        </Box>
    );
}

// Wrapper to simplify Suspense usage
function SuspensePage({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<PageLoader />}>
            {children}
        </Suspense>
    );
}

// Root layout that provides backend status context to all routes
function RootLayout() {
    return (
        <BackendStatusProvider>
            <Outlet />
        </BackendStatusProvider>
    );
}

const router = createBrowserRouter([
    {
        element: (
            <GlobalErrorBoundary>
                <RootLayout />
            </GlobalErrorBoundary>
        ),
        children: [
            {
                path: '/',
                element: <Landing />,
                errorElement: <RouteErrorBoundary />,
            },
            {
                path: '/backend-down',
                element: (
                    <SuspensePage>
                        <BackendDownPage />
                    </SuspensePage>
                ),
            },
            {
                path: '/pqc-learn',
                element: (
                    <SuspensePage>
                        <PqcLearn />
                    </SuspensePage>
                ),
                errorElement: <RouteErrorBoundary />,
            },
            {
                path: '/invite/:code',
                element: (
                    <SuspensePage>
                        <InviteLanding />
                    </SuspensePage>
                ),
                errorElement: <RouteErrorBoundary />,
            },
            {
                path: '/share/view/:token',
                element: (
                    <SuspensePage>
                        <PublicSharedFilePage />
                    </SuspensePage>
                ),
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
                        path: 'notes',
                        element: <NotesPage />,
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
                    {
                        path: 'analytics/performance',
                        element: (
                            <SuspensePage>
                                <AnalyticsPerformancePage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'analytics/audit',
                        element: (
                            <SuspensePage>
                                <AnalyticsAuditPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'analytics/logs',
                        element: (
                            <SuspensePage>
                                <AnalyticsLogsPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                ],
            },
            {
                path: '*',
                element: (
                    <SuspensePage>
                        <NotFound />
                    </SuspensePage>
                ),
            },
        ],
    },
]);

export function AppRouter() {
    const themeMode = useThemeStore((state) => state.theme);
    const theme = useMemo(() => getTheme(themeMode), [themeMode]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <AppInitializer />
                <RouterProvider router={router} />
            </ThemeProvider>
        </LocalizationProvider>
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

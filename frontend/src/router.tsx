import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { lazy, Suspense, useMemo, useEffect } from 'react';
import { Box, CircularProgress, ThemeProvider, CssBaseline } from '@mui/material';

import { Landing } from '@/pages/Landing';

// Lazy load page components
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const FilesPage = lazy(() => import('@/pages/FilesPage').then(m => ({ default: m.FilesPage })));
const GPAPage = lazy(() => import('@/pages/GPAPage').then(m => ({ default: m.GPAPage })));
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const TasksPage = lazy(() => import('@/pages/TasksPage').then(m => ({ default: m.TasksPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SocialPage = lazy(() => import('@/pages/SocialPage').then(m => ({ default: m.SocialPage })));
const InviteLanding = lazy(() => import('@/pages/InviteLanding').then(m => ({ default: m.InviteLanding })));
const PqcLearn = lazy(() => import('@/pages/PqcLearn').then(m => ({ default: m.PqcLearn })));
const NotFound = lazy(() => import('@/pages/NotFound').then(m => ({ default: m.NotFound })));
const BackendDownPage = lazy(() => import('@/pages/BackendDown').then(m => ({ default: m.BackendDownPage })));
const PublicSharedFilePage = lazy(() => import('@/pages/PublicSharedFilePage').then(m => ({ default: m.PublicSharedFilePage })));
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
                        element: (
                            <SuspensePage>
                                <Dashboard />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'files',
                        element: (
                            <SuspensePage>
                                <FilesPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'files/:folderId',
                        element: (
                            <SuspensePage>
                                <FilesPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'gpa',
                        element: (
                            <SuspensePage>
                                <GPAPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'zkp',
                        element: <ZKPVerifier />,
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'calendar',
                        element: (
                            <SuspensePage>
                                <CalendarPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'tasks',
                        element: (
                            <SuspensePage>
                                <TasksPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'security',
                        element: (
                            <SuspensePage>
                                <SettingsPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'social',
                        element: (
                            <SuspensePage>
                                <SocialPage />
                            </SuspensePage>
                        ),
                        errorElement: <RouteErrorBoundary />,
                    },
                    {
                        path: 'social/:roomId',
                        element: (
                            <SuspensePage>
                                <SocialPage />
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

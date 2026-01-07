import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { FilesPage } from '@/pages/FilesPage';
import { GPAPage } from '@/pages/GPAPage';
import { NotFound } from '@/pages/NotFound';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import { useThemeStore } from '@/stores/themeStore';
import { useMemo } from 'react';

// Placeholder pages for future implementation

function ZKPVerifier() {
    return (
        <div className="glass-card border-white/10 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">ZKP Verifier</h2>
            <p className="text-muted-foreground">Zero-Knowledge Proof verification interface coming soon...</p>
        </div>
    );
}

function SecuritySettings() {
    return (
        <div className="glass-card border-white/10 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Security Settings</h2>
            <p className="text-muted-foreground">PQC key management and security preferences coming soon...</p>
        </div>
    );
}

const router = createBrowserRouter([
    {
        path: '/',
        element: <Landing />,
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
                path: 'security',
                element: <SecuritySettings />,
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
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}


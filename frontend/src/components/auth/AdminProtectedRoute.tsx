import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { Box, CircularProgress, Typography } from '@mui/material';

interface AdminProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Protected route that requires sys_admin role
 * Redirects non-admin users to /dashboard
 */
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
    const location = useLocation();
    const { user, isAuthenticated, isAuthChecking, checkAuth } = useSessionStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Show loading while checking auth
    if (isAuthChecking) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <CircularProgress size={48} thickness={4} sx={{ color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                    Validating session...
                </Typography>
            </Box>
        );
    }

    // Redirect to landing if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location, showLogin: true }} replace />;
    }

    // Redirect to dashboard if not sys_admin
    if (user?.role !== 'sys_admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';


interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const location = useLocation();
    const { isAuthenticated, isAuthChecking, checkAuth } = useSessionStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    if (isAuthChecking) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center" style={{ backgroundColor: '#070708' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
                    <p className="text-muted-foreground text-sm" style={{ color: '#a1a1aa' }}>Validating session...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location, showLogin: true }} replace />;
    }

    return <>{children}</>;
}

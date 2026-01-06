import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import authService from '@/services/authService';
import tokenService from '@/services/tokenService';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const location = useLocation();
    const { isAuthenticated, setUser } = useSessionStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const validateSession = async () => {
            try {
                // First check if we have a valid token in localStorage
                const hasToken = tokenService.hasValidToken();

                if (!hasToken) {
                    // No token = definitely not authenticated
                    setIsValid(false);
                    setIsLoading(false);
                    return;
                }

                // Token exists, validate with backend
                const user = await authService.validateSession();
                if (user) {
                    setUser(user);
                    setIsValid(true);
                } else {
                    // Token was invalid, clear it
                    tokenService.removeToken();
                    setIsValid(false);
                }
            } catch (error) {
                console.error('Session validation failed:', error);
                // On error, clear potentially corrupt token
                tokenService.removeToken();
                setIsValid(false);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isAuthenticated) {
            validateSession();
        } else {
            setIsValid(true);
            setIsLoading(false);
        }
    }, [isAuthenticated, setUser]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center" style={{ backgroundColor: '#070708' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
                    <p className="text-muted-foreground text-sm" style={{ color: '#a1a1aa' }}>Validating session...</p>
                </div>
            </div>
        );
    }

    if (!isValid) {
        // Redirect to home page with login prompt (state can be used to show login dialog)
        return <Navigate to="/" state={{ from: location, showLogin: true }} replace />;
    }

    return <>{children}</>;
}


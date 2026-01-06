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
    const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

    useEffect(() => {
        const validateSession = async () => {
            console.log('[ProtectedRoute] Starting validation...');
            setDebugInfo('Checking token...');

            try {
                // First check if we have a valid token in localStorage
                const hasToken = tokenService.hasValidToken();
                console.log('[ProtectedRoute] hasToken:', hasToken);
                setDebugInfo(`Token exists: ${hasToken}`);

                if (!hasToken) {
                    console.log('[ProtectedRoute] No valid token, redirecting...');
                    setDebugInfo('No token - redirecting to login');
                    setIsValid(false);
                    setIsLoading(false);
                    return;
                }

                // Token exists, validate with backend
                setDebugInfo('Validating with server...');
                console.log('[ProtectedRoute] Calling validateSession API...');
                const user = await authService.validateSession();
                console.log('[ProtectedRoute] API response:', user);

                if (user) {
                    setDebugInfo(`Authenticated as: ${user.username}`);
                    setUser(user);
                    setIsValid(true);
                } else {
                    setDebugInfo('Server returned no user - clearing token');
                    // Token was invalid, clear it
                    tokenService.removeToken();
                    setIsValid(false);
                }
            } catch (error) {
                console.error('[ProtectedRoute] Validation error:', error);
                setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
                // On error, clear potentially corrupt token
                tokenService.removeToken();
                setIsValid(false);
            } finally {
                console.log('[ProtectedRoute] Validation complete, isValid:', isValid);
                setIsLoading(false);
            }
        };

        if (!isAuthenticated) {
            validateSession();
        } else {
            setDebugInfo('Already authenticated');
            setIsValid(true);
            setIsLoading(false);
        }
    }, [isAuthenticated, setUser]);

    // Debug: Always show something visible
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center" style={{ backgroundColor: '#070708' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
                    <p className="text-muted-foreground text-sm" style={{ color: '#a1a1aa' }}>Validating session...</p>
                    <p className="text-xs text-yellow-400 font-mono">[DEBUG] {debugInfo}</p>
                </div>
            </div>
        );
    }

    if (!isValid) {
        console.log('[ProtectedRoute] Not valid, redirecting to /');
        // Redirect to home page with login prompt (state can be used to show login dialog)
        return <Navigate to="/" state={{ from: location, showLogin: true }} replace />;
    }

    return <>{children}</>;
}

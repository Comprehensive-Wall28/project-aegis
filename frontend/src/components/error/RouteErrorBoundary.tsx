import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router-dom';
import { AegisLogo } from '@/components/AegisLogo';
import { Home, ArrowLeft, RefreshCw, AlertTriangle, ServerCrash, WifiOff } from 'lucide-react';

interface ErrorDetails {
    title: string;
    message: string;
    icon: React.ReactNode;
    showRetry: boolean;
}

function getErrorDetails(error: unknown): ErrorDetails {
    // Route error responses (404, etc.)
    if (isRouteErrorResponse(error)) {
        if (error.status === 404) {
            return {
                title: 'Page Not Found',
                message: 'The quantum realm you\'re searching for doesn\'t exist in this dimension.',
                icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
                showRetry: false
            };
        }
        if (error.status === 500) {
            return {
                title: 'Server Error',
                message: 'Our servers encountered an unexpected error. Please try again later.',
                icon: <ServerCrash className="w-16 h-16 text-red-500" />,
                showRetry: true
            };
        }
        return {
            title: `Error ${error.status}`,
            message: error.statusText || 'An unexpected error occurred.',
            icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
            showRetry: true
        };
    }

    // React hooks errors
    if (error instanceof Error) {
        if (error.message.includes('fewer hooks') || error.message.includes('more hooks')) {
            return {
                title: 'Rendering Error',
                message: 'A component failed to render correctly. This might be a temporary issue.',
                icon: <ServerCrash className="w-16 h-16 text-orange-500" />,
                showRetry: true
            };
        }
        if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('timeout')) {
            return {
                title: 'Connection Error',
                message: 'Unable to connect to the server. Please check your connection and try again.',
                icon: <WifiOff className="w-16 h-16 text-blue-500" />,
                showRetry: true
            };
        }
        return {
            title: 'Something Went Wrong',
            message: error.message || 'An unexpected error occurred while loading this page.',
            icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
            showRetry: true
        };
    }

    // Fallback
    return {
        title: 'Unexpected Error',
        message: 'Something went wrong. Please try again.',
        icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
        showRetry: true
    };
}

export function RouteErrorBoundary() {
    const error = useRouteError();
    const navigate = useNavigate();
    const { title, message, icon, showRetry } = getErrorDetails(error);

    const handleRetry = () => {
        window.location.reload();
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    // Log error for debugging
    console.error('Route Error:', error);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center px-6 max-w-lg">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <AegisLogo size={100} />
                </div>

                {/* Error Icon */}
                <div className="flex justify-center mb-6">
                    {icon}
                </div>

                {/* Error Title */}
                <h1 className="text-3xl font-bold text-foreground mb-3">
                    {title}
                </h1>

                {/* Error Message */}
                <p className="text-muted-foreground mb-8">
                    {message}
                </p>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {showRetry && (
                        <button
                            onClick={handleRetry}
                            className="w-36 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-105"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Retry
                        </button>
                    )}
                    <Link
                        to="/dashboard"
                        className="w-36 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary/20 text-primary font-medium hover:bg-primary/30 transition-all hover:scale-105"
                    >
                        <Home className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <button
                        onClick={handleGoBack}
                        className="w-36 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-foreground font-medium hover:bg-white/10 transition-all hover:scale-105"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </button>
                </div>

                {/* Technical details (collapsed by default in production) */}
                {import.meta.env.DEV && error instanceof Error && (
                    <details className="mt-8 text-left">
                        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                            Technical Details
                        </summary>
                        <pre className="mt-2 p-4 bg-white/5 rounded-lg text-xs text-muted-foreground overflow-auto max-h-40">
                            {error.stack || error.message}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
}

export default RouteErrorBoundary;

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AegisLogo } from '@/components/AegisLogo';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleRetry = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <div className="text-center px-6 max-w-lg">
                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <AegisLogo size={100} />
                        </div>

                        {/* Error Icon */}
                        <div className="flex justify-center mb-6">
                            <AlertTriangle className="w-16 h-16 text-red-500" />
                        </div>

                        {/* Error Title */}
                        <h1 className="text-3xl font-bold text-foreground mb-3">
                            Critical Application Error
                        </h1>

                        {/* Error Message */}
                        <p className="text-muted-foreground mb-8">
                            A critical error occurred in the application core. We've logged the incident and are working on a fix.
                        </p>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={this.handleRetry}
                                className="w-36 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-105"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Retry
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="w-36 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-foreground font-medium hover:bg-white/10 transition-all hover:scale-105"
                            >
                                <Home className="w-5 h-5" />
                                Home
                            </button>
                        </div>

                        {/* Technical details (collapsed by default in production) */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="mt-8 text-left">
                                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                    Technical Details
                                </summary>
                                <pre className="mt-2 p-4 bg-white/5 rounded-lg text-xs text-muted-foreground overflow-auto max-h-40">
                                    {this.state.error.stack || this.state.error.message}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.children;
    }

    // This is a workaround for TypeScript's restriction on this.props.children in older React versions
    // but React 18/19 should be fine. Just in case:
    private get children() {
        return this.props.children;
    }
}

export default GlobalErrorBoundary;

import { Link } from 'react-router-dom';
import { AegisLogo } from '@/components/AegisLogo';
import { Home, RefreshCw } from 'lucide-react';

interface BackendDownProps {
    onRetry?: () => void;
}

export function BackendDown({ onRetry }: BackendDownProps) {
    return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <div className="text-center px-6">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <AegisLogo size={100} />
                </div>

                {/* Error Icon */}
                <h1 className="text-6xl font-bold text-foreground mb-4 tracking-tight">
                    5<span className="text-primary">0</span>3
                </h1>

                <h2 className="text-xl font-semibold text-foreground mb-3">
                    Backend Unavailable
                </h2>

                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    The quantum relay seems to be offline. Our backend servers might be
                    undergoing maintenance or experiencing temporary issues.
                </p>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-105"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Retry Connection
                        </button>
                    )}
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-foreground font-medium hover:bg-white/10 transition-all hover:scale-105"
                    >
                        <Home className="w-5 h-5" />
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default BackendDown;

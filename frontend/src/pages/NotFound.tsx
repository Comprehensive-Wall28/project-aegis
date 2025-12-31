import { Link } from 'react-router-dom';
import { AegisLogo } from '@/components/AegisLogo';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center px-6">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <AegisLogo size={120} />
                </div>

                {/* 404 Text */}
                <h1 className="text-8xl font-bold text-foreground mb-4 tracking-tight">
                    4<span className="text-primary">0</span>4
                </h1>

                <h2 className="text-2xl font-semibold text-foreground mb-3">
                    Page Not Found
                </h2>

                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    The quantum realm you're searching for doesn't exist in this dimension.
                    Perhaps it was encrypted beyond recovery.
                </p>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-105"
                    >
                        <Home className="w-5 h-5" />
                        Return Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-foreground font-medium hover:bg-white/10 transition-all hover:scale-105"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NotFound;

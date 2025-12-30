import { Activity, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { motion } from 'framer-motion';

export function DashboardHeader() {
    const { user, pqcEngineStatus } = useSessionStore();

    const getStatusColor = () => {
        switch (pqcEngineStatus) {
            case 'operational':
                return 'text-[oklch(75%_0.18_145)]'; // Safety Green
            case 'initializing':
                return 'text-amber-400';
            case 'error':
                return 'text-destructive';
            default:
                return 'text-muted-foreground';
        }
    };

    const getStatusIcon = () => {
        switch (pqcEngineStatus) {
            case 'operational':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'initializing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'error':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const getStatusText = () => {
        switch (pqcEngineStatus) {
            case 'operational':
                return 'Operational';
            case 'initializing':
                return 'Initializing...';
            case 'error':
                return 'Error';
            default:
                return 'Unknown';
        }
    };

    return (
        <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                        Welcome back, <span className="text-primary">{user?.username || user?.email?.split('@')[0] || 'Agent'}</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Your secure command center awaits.
                    </p>
                </motion.div>

                {/* System Health Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="flex items-center gap-3"
                >
                    <div className="glass-card px-4 py-2.5 rounded-xl flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium text-foreground hidden sm:inline">
                                PQC Engine
                            </span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className={`flex items-center gap-1.5 ${getStatusColor()}`}>
                            {getStatusIcon()}
                            <span className="text-sm font-medium">
                                {getStatusText()}
                            </span>
                        </div>
                        {pqcEngineStatus === 'operational' && (
                            <div className="h-2 w-2 rounded-full bg-[oklch(75%_0.18_145)] animate-pulse" />
                        )}
                    </div>
                </motion.div>
            </div>
        </header>
    );
}

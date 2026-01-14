import { Activity, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { motion } from 'framer-motion';

export function DashboardHeader() {
    const { user, pqcEngineStatus } = useSessionStore();

    const getStatusColor = () => {
        switch (pqcEngineStatus) {
            case 'operational':
                return 'text-[oklch(75%_0.18_210)]';
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

                {/* System Health Badge - Enhanced */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="flex items-center gap-3"
                >
                    <div className="bento-card px-4 py-3 flex items-center gap-4">
                        {/* PQC Engine Section */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Shield className="h-5 w-5 text-primary" />
                                {pqcEngineStatus === 'operational' && (
                                    <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[oklch(75%_0.18_210)] shadow-[0_0_8px_oklch(75%_0.18_210)]" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">
                                    PQC Engine
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    @noble/post-quantum v0.2.1
                                </span>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-white/10" />

                        {/* Status Section */}
                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 ${getStatusColor()}`}>
                                {getStatusIcon()}
                                <span className="text-sm font-medium">
                                    {getStatusText()}
                                </span>
                            </div>
                            {pqcEngineStatus === 'operational' && (
                                <div className="relative">
                                    <div className="h-2.5 w-2.5 rounded-full bg-[oklch(75%_0.18_210)] shadow-[0_0_10px_oklch(75%_0.18_210)]" />
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </header>
    );
}

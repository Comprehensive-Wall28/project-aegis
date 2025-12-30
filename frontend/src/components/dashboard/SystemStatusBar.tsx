import { Shield, CheckCircle2, AlertCircle, Loader2, Activity } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { motion } from 'framer-motion';

export function SystemStatusBar() {
    const { pqcEngineStatus } = useSessionStore();

    const getStatusConfig = () => {
        switch (pqcEngineStatus) {
            case 'operational':
                return {
                    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                    text: 'Operational',
                    color: 'text-[oklch(75%_0.18_210)]',
                    bgColor: 'bg-[oklch(75%_0.18_210)]/10',
                    dotColor: 'bg-[oklch(75%_0.18_210)]'
                };
            case 'initializing':
                return {
                    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
                    text: 'Initializing...',
                    color: 'text-amber-400',
                    bgColor: 'bg-amber-400/10',
                    dotColor: 'bg-amber-400'
                };
            case 'error':
                return {
                    icon: <AlertCircle className="h-3.5 w-3.5" />,
                    text: 'Error',
                    color: 'text-destructive',
                    bgColor: 'bg-destructive/10',
                    dotColor: 'bg-destructive'
                };
            default:
                return {
                    icon: <Activity className="h-3.5 w-3.5" />,
                    text: 'Unknown',
                    color: 'text-muted-foreground',
                    bgColor: 'bg-muted/10',
                    dotColor: 'bg-muted-foreground'
                };
        }
    };

    const status = getStatusConfig();
    const isOperational = pqcEngineStatus === 'operational';

    return (
        <div className="h-10 bg-transparent flex items-center justify-between px-6">
            {/* Left: System Label */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>System Health</span>
                <span className="text-white/20">•</span>
                <span className="font-mono-tech text-text-primary/70">v1.0.0</span>
            </div>

            {/* Right: PQC Engine Status */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4"
            >
                {/* PQC Engine Badge */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Shield className="h-4 w-4 text-primary" />
                        {isOperational && (
                            <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[oklch(75%_0.18_210)] animate-ping-glow" />
                        )}
                    </div>
                    <span className="text-xs font-medium text-foreground">PQC Engine</span>
                    <span className="text-[10px] font-mono-tech text-muted-foreground hidden sm:inline">
                        @noble/post-quantum
                    </span>
                </div>

                <div className="h-4 w-px bg-white/10" />

                {/* Status Indicator */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${status.bgColor}`}>
                    <span className={status.color}>{status.icon}</span>
                    <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
                    {isOperational && (
                        <div className="relative ml-1">
                            <div className={`h-2 w-2 rounded-full ${status.dotColor}`} />
                            <div className={`absolute inset-0 h-2 w-2 rounded-full ${status.dotColor} animate-ping-glow`} />
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

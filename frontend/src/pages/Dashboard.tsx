import { motion } from 'framer-motion';
import { VaultQuickView } from '@/components/dashboard/widgets/VaultQuickView';
import { IntegrityMonitor } from '@/components/dashboard/widgets/IntegrityMonitor';
import { GPASnapshot } from '@/components/dashboard/widgets/GPASnapshot';
import { Activity, Zap, Lock } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export function Dashboard() {
    const { pqcEngineStatus } = useSessionStore();
    const isOperational = pqcEngineStatus === 'operational';

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
            }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
            {/* Widget A: Vault Quick-View - Large, spans 2 columns and 2 rows */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-2 lg:row-span-2"
            >
                <VaultQuickView />
            </motion.div>

            {/* Widget B: Integrity Monitor - Tall, spans 2 columns and 2 rows */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-2 lg:row-span-2"
            >
                <IntegrityMonitor />
            </motion.div>

            {/* Widget C: GPA Snapshot */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-1"
            >
                <GPASnapshot />
            </motion.div>

            {/* System Metrics Widget */}
            <motion.div
                variants={itemVariants}
                className={`glass-panel p-6 rounded-2xl ${isOperational ? 'bento-card-glow' : ''}`}
            >
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    System Metrics
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Encryption Ops</span>
                        <span className="text-sm font-mono-tech text-foreground">0</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Proofs Generated</span>
                        <span className="text-sm font-mono-tech text-foreground">0</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Integrity Checks</span>
                        <span className="text-sm font-mono-tech text-primary">Standby</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Last Sync</span>
                        <span className="text-sm font-mono-tech text-foreground">Never</span>
                    </div>
                </div>
            </motion.div>

            {/* Quick Encrypt Action */}
            <motion.div
                variants={itemVariants}
                className={`glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors group ${isOperational ? 'bento-card-glow' : ''}`}
            >
                <div className="p-3 rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
                    <Zap className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Quick Encrypt</span>
                <span className="text-xs text-muted-foreground mt-1">Upload & protect</span>
            </motion.div>

            {/* Key Rotation Action */}
            <motion.div
                variants={itemVariants}
                className={`glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors group ${isOperational ? 'bento-card-glow' : ''}`}
            >
                <div className="p-3 rounded-xl bg-violet-500/10 mb-3 group-hover:bg-violet-500/20 transition-colors">
                    <Lock className="h-6 w-6 text-violet-400" />
                </div>
                <span className="text-sm font-medium text-foreground">Key Rotation</span>
                <span className="text-xs text-muted-foreground mt-1">ML-KEM-768</span>
            </motion.div>
        </motion.div>
    );
}

import { motion } from 'framer-motion';
import { VaultQuickView } from '@/components/dashboard/widgets/VaultQuickView';
import { IntegrityMonitor } from '@/components/dashboard/widgets/IntegrityMonitor';
import { GPASnapshot } from '@/components/dashboard/widgets/GPASnapshot';
import { Activity, Zap, Lock } from 'lucide-react';

export function Dashboard() {

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
            {/* Top Row / Section: Vault (3/4) and Side Info (1/4) */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-3 lg:row-span-2"
            >
                <VaultQuickView />
            </motion.div>

            {/* GPA Snapshot - Top Right */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-1"
            >
                <GPASnapshot />
            </motion.div>

            {/* System Metrics - Under GPA */}
            <motion.div
                variants={itemVariants}
                className="glass-panel p-6 rounded-2xl"
            >
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    System Metrics
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Encryption Ops</span>
                        <span className="text-sm font-mono-tech text-text-primary">0</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Proofs Generated</span>
                        <span className="text-sm font-mono-tech text-text-primary">0</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Integrity Checks</span>
                        <span className="text-sm font-mono-tech text-accent-blue">Standby</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Last Sync</span>
                        <span className="text-sm font-mono-tech text-text-primary">Never</span>
                    </div>
                </div>
            </motion.div>

            {/* Bottom Section: Wide Integrity Monitor */}
            <motion.div
                variants={itemVariants}
                className="lg:col-span-4"
            >
                <IntegrityMonitor />
            </motion.div>

            {/* Action Buttons */}
            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    variants={itemVariants}
                    className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors group"
                >
                    <div className="p-3 rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
                        <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-text-primary">Quick Encrypt</span>
                    <span className="text-xs text-text-secondary mt-1">Upload & protect</span>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors group"
                >
                    <div className="p-3 rounded-xl bg-violet-500/10 mb-3 group-hover:bg-violet-500/20 transition-colors">
                        <Lock className="h-6 w-6 text-violet-400" />
                    </div>
                    <span className="text-sm font-medium text-text-primary">Key Rotation</span>
                    <span className="text-xs text-text-secondary mt-1">ML-KEM-768</span>
                </motion.div>
            </div>
        </motion.div>
    );
}

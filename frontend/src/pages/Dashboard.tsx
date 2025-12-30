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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
            {/* Vault Quick-View: 3/4 Width */}
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
                className="bento-card p-6 flex flex-col h-full bg-zinc-900/40"
            >
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-primary/60 mb-4 flex items-center gap-2">
                    <Activity className="h-3 w-3 text-primary" />
                    Live Metrics
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground/60 font-medium">Encryption Ops</span>
                        <span className="font-mono-tech text-foreground/80">0</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground/60 font-medium">Integrity Checks</span>
                        <span className="font-mono-tech text-primary/80">Standby</span>
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
            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                <motion.div
                    variants={itemVariants}
                    className="bento-card p-6 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-all group bg-zinc-900/40"
                >
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-foreground block">Quick Encrypt</span>
                        <span className="text-[10px] text-muted-foreground/60">Upload & protect with ML-KEM</span>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    className="bento-card p-6 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-all group bg-zinc-900/40"
                >
                    <div className="p-3 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                        <Lock className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-foreground block">Key Rotation</span>
                        <span className="text-[10px] text-muted-foreground/60">Rotate PQC keys regularly</span>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

import { motion } from 'framer-motion';
import { VaultQuickView } from '@/components/dashboard/widgets/VaultQuickView';
import { IntegrityMonitor } from '@/components/dashboard/widgets/IntegrityMonitor';
import { GPASnapshot } from '@/components/dashboard/widgets/GPASnapshot';

export function Dashboard() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94] as const // easeOut cubic bezier
            }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {/* Widget A: Vault Quick-View - Takes 2 columns on lg */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
                <VaultQuickView />
            </motion.div>

            {/* Widget B: Integrity Monitor */}
            <motion.div variants={itemVariants}>
                <IntegrityMonitor />
            </motion.div>

            {/* Widget C: GPA Snapshot */}
            <motion.div variants={itemVariants}>
                <GPASnapshot />
            </motion.div>

            {/* Placeholder for future widgets */}
            <motion.div
                variants={itemVariants}
                className="md:col-span-2"
            >
                <div className="glass-card border-white/10 rounded-lg p-6 h-full min-h-[200px] flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-muted-foreground text-sm">More widgets coming soon...</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">ZKP Verifier • Security Logs • Activity Feed</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

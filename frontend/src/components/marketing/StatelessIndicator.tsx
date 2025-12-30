import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';

export function StatelessIndicator() {
    return (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[oklch(80%_0.2_140)]/10 border border-[oklch(80%_0.2_140)]/20 backdrop-blur-sm">
            <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Radio className="w-3 h-3 text-[oklch(80%_0.2_140)]" />
            </motion.div>
            <span className="text-xs font-medium text-[oklch(80%_0.2_140)] tracking-wide uppercase">
                0% Data Retention
            </span>
        </div>
    );
}

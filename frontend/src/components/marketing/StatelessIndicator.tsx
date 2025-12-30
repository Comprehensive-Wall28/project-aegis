import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';

export function StatelessIndicator() {
    return (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
            <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Radio className="w-3 h-3 text-emerald-400" />
            </motion.div>
            <span className="text-xs font-medium text-emerald-300 tracking-wide uppercase">
                0% Data Retention
            </span>
        </div>
    );
}

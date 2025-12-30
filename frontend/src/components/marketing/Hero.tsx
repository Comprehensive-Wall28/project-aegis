import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Lock, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import { StatelessIndicator } from "./StatelessIndicator";
import { useEffect, useState } from "react";

function MerkleIntegrityFeed() {
    const [hashes, setHashes] = useState<string[]>([]);

    useEffect(() => {
        const generateHash = () => Math.random().toString(16).substring(2, 10).toUpperCase();
        setHashes(Array.from({ length: 12 }, generateHash));
        const interval = setInterval(() => {
            setHashes(prev => [...prev.slice(1), generateHash()]);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full overflow-hidden whitespace-nowrap py-4 border-y border-white/5 bg-black/20 flex items-center">
            <div className="flex animate-scroll hover:pause gap-8 px-4">
                {hashes.map((hash, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">HASH:</span>
                        <span className="text-[10px] font-mono text-zinc-400">{hash}</span>
                        <motion.div
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 rounded-full bg-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        />
                    </div>
                ))}
            </div>
            {/* Duplicate for seamless scrolling */}
            <div className="flex animate-scroll hover:pause gap-8 px-4">
                {hashes.map((hash, i) => (
                    <div key={i + 12} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">HASH:</span>
                        <span className="text-[10px] font-mono text-zinc-400">{hash}</span>
                        <motion.div
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 rounded-full bg-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Hero() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
    } as any;

    return (
        <section className="relative overflow-hidden pt-32 pb-16 md:pt-48 md:pb-32">
            {/* Base Background */}
            <div className="absolute inset-0 bg-zinc-950 -z-20" />

            {/* Mesh Gradient Background - Slow Moving */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-indigo-900/40 rounded-full blur-[140px] animate-mesh" />
                <div className="absolute top-[15%] right-[-10%] w-[45%] h-[45%] bg-teal-900/30 rounded-full blur-[120px] animate-mesh-delayed" />
                <div className="absolute bottom-[5%] left-[15%] w-[55%] h-[55%] bg-indigo-950/35 rounded-full blur-[160px] animate-mesh-slow" />
            </div>


            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="container px-4 md:px-6 mx-auto relative z-10 flex flex-col items-center text-center"
            >
                <motion.div variants={itemVariants} className="mb-8">
                    <StatelessIndicator />
                </motion.div>

                <motion.h1
                    variants={itemVariants}
                    className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl"
                >
                    Quantum-Safe Productivity for the
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(70%_0.2_250)] to-[oklch(85%_0.15_190)]"> Post-Quantum Era</span>
                </motion.h1>

                <motion.p
                    variants={itemVariants}
                    className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed"
                >
                    Experience the world's first stateless productivity suite powered by ML-KEM encryption.
                    Your data never leaves your browser unencrypted.
                </motion.p>

                <motion.div
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                >
                    <Button size="lg" variant="glow" className="group relative overflow-hidden">
                        Secure Your Vault
                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <Button size="lg" variant="outline" className="border-white/10 hover:border-indigo-500/50 hover:bg-white/5 transition-colors">
                        Learn about PQC
                    </Button>
                </motion.div>

                {/* Product Preview / Visual Abstract */}
                <motion.div
                    variants={itemVariants}
                    className="mt-20 w-full max-w-5xl rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-2 shadow-2xl relative overflow-hidden"
                >
                    {/* Fake UI Header */}
                    <div className="h-8 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    {/* Fake UI Body Placeholder */}
                    <div className="aspect-[16/9] w-full bg-gradient-to-br from-indigo-950/20 to-zinc-950 flex items-center justify-center relative">
                        <div className="absolute inset-0 flex items-center justify-center gap-12 opacity-30">
                            <ShieldCheck className="w-24 h-24 text-indigo-500/40" />
                            <Lock className="w-24 h-24 text-indigo-500/40" />
                            <Fingerprint className="w-24 h-24 text-indigo-500/40" />
                        </div>
                        <div className="z-10 text-center">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400/80 mb-3 font-medium">Encrypted Session Active</p>
                            <p className="text-3xl font-mono text-white/90 tracking-tighter">0x7F...3A9C</p>
                        </div>

                        {/* Scan line effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent animate-scan pointer-events-none" />
                    </div>

                    {/* Merkle Integrity Feed */}
                    <MerkleIntegrityFeed />
                </motion.div>

            </motion.div>
        </section>
    );
}


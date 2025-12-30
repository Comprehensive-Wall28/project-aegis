import { Button } from "@/components/ui/button";
import { MoveRight, ShieldCheck, Lock, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import { StatelessIndicator } from "./StatelessIndicator";

export function Hero() {
    return (
        <section className="relative overflow-hidden pt-32 pb-16 md:pt-48 md:pb-32">
            {/* Background Gradients */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 transform -translate-x-1/2 left-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-[100%] blur-[100px] opacity-30" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-emerald-600/10 rounded-[100%] blur-[120px] opacity-20" />
            </div>

            <div className="container px-4 md:px-6 mx-auto relative z-10 flex flex-col items-center text-center">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <StatelessIndicator />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl"
                >
                    Quantum-Safe Productivity for the
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300"> Post-Quantum Era</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
                >
                    Experience the world's first stateless productivity suite powered by ML-KEM encryption.
                    Your data never leaves your browser unencrypted.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                >
                    <Button size="lg" variant="glow" className="group">
                        Secure Your Vault
                        <MoveRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <Button size="lg" variant="outline" className="border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/10">
                        Learn about PQC
                    </Button>
                </motion.div>

                {/* Product Preview / Visual Abstract */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="mt-20 w-full max-w-5xl rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-2 shadow-2xl relative overflow-hidden"
                >
                    {/* Fake UI Header */}
                    <div className="h-8 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                    </div>
                    {/* Fake UI Body Placeholder */}
                    <div className="aspect-[16/9] w-full bg-gradient-to-br from-indigo-950/30 to-black flex items-center justify-center relative">
                        <div className="absolute inset-0 flex items-center justify-center gap-12 opacity-50">
                            <ShieldCheck className="w-24 h-24 text-indigo-500/50" />
                            <Lock className="w-24 h-24 text-indigo-500/50" />
                            <Fingerprint className="w-24 h-24 text-indigo-500/50" />
                        </div>
                        <div className="z-10 text-center">
                            <p className="text-sm uppercase tracking-widest text-indigo-400 mb-2">Encrypted Session Active</p>
                            <p className="text-2xl font-mono text-white">0x7F...3A9C</p>
                        </div>
                    </div>
                    {/* Scan line effect */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent animate-scan pointer-events-none" />
                </motion.div>

            </div>
        </section>
    );
}

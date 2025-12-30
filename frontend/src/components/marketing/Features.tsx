import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, GitGraph, FileKey } from "lucide-react";
import { motion } from "framer-motion";

const features = [
    {
        title: "Quantum Vault",
        description: "Client-side ML-KEM encryption ensures your private keys never leave your browser. Resistant to quantum computer attacks.",
        icon: Shield,
        color: "text-indigo-400",
    },
    {
        title: "Merkle Integrity",
        description: "Tamper-proof verifiable logs using Merkle-Tree hashing. Calculate the root hash of your productivity history instantly.",
        icon: GitGraph,
        color: "text-emerald-400",
    },
    {
        title: "ZKP Certificates",
        description: "Prove your merit without revealing raw data. Zero-Knowledge Proofs allow you to verify assertions privately.",
        icon: FileKey,
        color: "text-cyan-400",
    },
];

export function Features() {
    return (
        <section id="features" className="py-24 bg-black/50 relative">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
                        The Three Pillars of Aegis
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Security, Integrity, and Privacy woven into the fabric of your workflow.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm hover:border-indigo-500/30 hover:bg-zinc-900/80 h-full group">
                                <CardHeader>
                                    <div className={`p-3 rounded-lg w-fit bg-zinc-800/50 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                        <feature.icon className={`w-8 h-8 ${feature.color}`} />
                                    </div>
                                    <CardTitle className="text-xl text-zinc-100">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-zinc-400 text-base leading-relaxed">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

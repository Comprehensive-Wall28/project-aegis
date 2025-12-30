import { useState, useEffect } from 'react';
import { GraduationCap, Sparkles, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import integrityService from '@/services/integrityService';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/stores/sessionStore';

type ProofStatus = 'none' | 'generating' | 'generated' | 'error';

export function GPASnapshot() {
    const { pqcEngineStatus } = useSessionStore();
    const [currentGPA, setCurrentGPA] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [proofStatus, setProofStatus] = useState<ProofStatus>('none');
    const [proofHash, setProofHash] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        fetchGPAData();
    }, []);

    const fetchGPAData = async () => {
        try {
            setIsLoading(true);
            const data = await integrityService.verifyIntegrity();
            setCurrentGPA(data.currentGPA);
        } catch (err) {
            console.error('Failed to fetch GPA:', err);
            setCurrentGPA(0);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateProof = async () => {
        try {
            setProofStatus('generating');
            setIsScanning(true);

            await new Promise(resolve => setTimeout(resolve, 3000));

            setIsScanning(false);

            const mockProofHash = '0x' + Array.from({ length: 64 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('');

            setProofHash(mockProofHash);
            setProofStatus('generated');
        } catch (err) {
            console.error('Proof generation failed:', err);
            setProofStatus('error');
            setIsScanning(false);
        }
    };

    const gpaPercentage = currentGPA ? (currentGPA / 4.0) * 100 : 0;
    const meetsThreshold = currentGPA !== null && currentGPA >= 3.5;
    const isOperational = pqcEngineStatus === 'operational';

    const gaugeAngle = (gpaPercentage / 100) * 180;
    const createArc = (startAngle: number, endAngle: number, radius: number) => {
        const start = polarToCartesian(60, 60, radius, endAngle - 90);
        const end = polarToCartesian(60, 60, radius, startAngle - 90);
        const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad)
        };
    };

    return (
        <div className={`glass-panel rounded-2xl ${isOperational ? 'bento-card-glow' : ''} h-full p-6 flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        GPA Snapshot
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">ZKP for GPA ≥ 3.5</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center">
                {isLoading ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                    <>
                        {/* Semi-circular Gauge */}
                        <div className="relative w-28 h-16 mb-3">
                            <svg viewBox="0 0 120 70" className="w-full h-full">
                                <path
                                    d={createArc(0, 180, 50)}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                />
                                <motion.path
                                    d={createArc(0, gaugeAngle, 50)}
                                    fill="none"
                                    stroke="url(#gaugeGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                                <AnimatePresence>
                                    {isScanning && (
                                        <motion.line
                                            x1="60"
                                            y1="60"
                                            x2="60"
                                            y2="10"
                                            stroke="rgba(99, 102, 241, 0.8)"
                                            strokeWidth="2"
                                            initial={{ rotate: -90 }}
                                            animate={{ rotate: 90 }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                ease: "linear"
                                            }}
                                            style={{ transformOrigin: '60px 60px' }}
                                        />
                                    )}
                                </AnimatePresence>
                                <defs>
                                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="oklch(55% 0.25 280)" />
                                        <stop offset="100%" stopColor="oklch(75% 0.18 210)" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                                <span className="text-xl font-bold text-foreground">
                                    {currentGPA?.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-muted-foreground block -mt-0.5">/ 4.00</span>
                            </div>
                        </div>

                        {/* Threshold Status */}
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${meetsThreshold
                            ? 'bg-[oklch(75%_0.18_210)]/10 text-[oklch(75%_0.18_210)]'
                            : 'bg-amber-500/10 text-amber-400'
                            }`}>
                            {meetsThreshold ? (
                                <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span className="text-[10px] font-medium">Threshold Met</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="h-3 w-3" />
                                    <span className="text-[10px] font-medium">Below Threshold</span>
                                </>
                            )}
                        </div>

                        {/* Proof Status */}
                        <AnimatePresence>
                            {proofStatus === 'generated' && proofHash && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-3 w-full p-2 rounded-lg bg-[oklch(75%_0.18_210)]/10 border border-[oklch(75%_0.18_210)]/30"
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Sparkles className="h-3 w-3 text-[oklch(75%_0.18_210)]" />
                                        <span className="text-[10px] font-medium text-[oklch(75%_0.18_210)]">
                                            ZK Proof Generated
                                        </span>
                                    </div>
                                    <p className="font-mono-tech text-[9px] text-muted-foreground truncate">
                                        {proofHash}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>

            {/* Footer */}
            <Button
                className="w-full mt-3"
                variant="glow"
                size="sm"
                onClick={handleGenerateProof}
                disabled={proofStatus === 'generating' || !meetsThreshold}
            >
                {proofStatus === 'generating' ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                    </>
                ) : proofStatus === 'generated' ? (
                    <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Proof Ready
                    </>
                ) : (
                    <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Proof
                    </>
                )}
            </Button>
        </div>
    );
}

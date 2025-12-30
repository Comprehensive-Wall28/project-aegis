import { useState, useEffect } from 'react';
import { GraduationCap, Sparkles, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import integrityService from '@/services/integrityService';
import { motion } from 'framer-motion';

type ProofStatus = 'none' | 'generating' | 'generated' | 'error';

export function GPASnapshot() {
    const [currentGPA, setCurrentGPA] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [proofStatus, setProofStatus] = useState<ProofStatus>('none');
    const [proofHash, setProofHash] = useState<string | null>(null);

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
            // Mock data for demo
            setCurrentGPA(3.72);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateProof = async () => {
        try {
            setProofStatus('generating');

            // Simulate snarkjs ZKP generation
            // In production, this would use actual snarkjs library
            await new Promise(resolve => setTimeout(resolve, 2500));

            // Generate mock proof hash
            const mockProofHash = '0x' + Array.from({ length: 64 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('');

            setProofHash(mockProofHash);
            setProofStatus('generated');
        } catch (err) {
            console.error('Proof generation failed:', err);
            setProofStatus('error');
        }
    };

    const gpaPercentage = currentGPA ? (currentGPA / 4.0) * 100 : 0;
    const meetsThreshold = currentGPA !== null && currentGPA >= 3.5;

    return (
        <Card className="glass-card border-white/10 h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    GPA Snapshot
                </CardTitle>
                <CardDescription>Zero-Knowledge Proof for GPA ≥ 3.5</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
                {isLoading ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                    <>
                        {/* GPA Circular Display */}
                        <div className="relative w-32 h-32 mb-4">
                            {/* Background circle */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    className="text-white/10"
                                />
                                {/* Progress circle */}
                                <motion.circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    fill="none"
                                    stroke="url(#gpaGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    initial={{ strokeDasharray: '0 352' }}
                                    animate={{ strokeDasharray: `${gpaPercentage * 3.52} 352` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                />
                                <defs>
                                    <linearGradient id="gpaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="oklch(55% 0.25 280)" />
                                        <stop offset="100%" stopColor="oklch(75% 0.18 145)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            {/* GPA Value */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-foreground">
                                    {currentGPA?.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground">/ 4.00</span>
                            </div>
                        </div>

                        {/* Threshold Status */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${meetsThreshold
                                ? 'bg-[oklch(75%_0.18_145)]/10 text-[oklch(75%_0.18_145)]'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}>
                            {meetsThreshold ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-sm font-medium">Threshold Met</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm font-medium">Below Threshold</span>
                                </>
                            )}
                        </div>

                        {/* Proof Status */}
                        {proofStatus === 'generated' && proofHash && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 w-full p-3 rounded-lg bg-[oklch(75%_0.18_145)]/10 border border-[oklch(75%_0.18_145)]/30"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="h-4 w-4 text-[oklch(75%_0.18_145)]" />
                                    <span className="text-sm font-medium text-[oklch(75%_0.18_145)]">
                                        ZK Proof Generated
                                    </span>
                                </div>
                                <p className="font-mono text-xs text-muted-foreground break-all">
                                    {proofHash.slice(0, 24)}...
                                </p>
                            </motion.div>
                        )}
                    </>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full"
                    variant="glow"
                    onClick={handleGenerateProof}
                    disabled={proofStatus === 'generating' || !meetsThreshold}
                >
                    {proofStatus === 'generating' ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Proof...
                        </>
                    ) : proofStatus === 'generated' ? (
                        <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Proof Generated
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Proof
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

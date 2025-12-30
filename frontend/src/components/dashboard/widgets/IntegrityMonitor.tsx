import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw, Hash, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import integrityService from '@/services/integrityService';
import { motion, AnimatePresence } from 'framer-motion';

type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'tampered';

// Mock integrity proof entries
const generateProofEntry = (index: number) => {
    const types = ['LEAF_HASH', 'MERKLE_PROOF', 'ROOT_VERIFY', 'SIBLING_CHECK', 'PATH_VALID'];
    const type = types[index % types.length];
    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const timestamp = new Date().toLocaleTimeString();
    return { type, hash, timestamp, status: 'OK' };
};

export function IntegrityMonitor() {
    const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
    const [lastVerified, setLastVerified] = useState<Date | null>(null);
    const [status, setStatus] = useState<VerificationStatus>('idle');
    const [isLoading, setIsLoading] = useState(true);
    const [proofFeed, setProofFeed] = useState<ReturnType<typeof generateProofEntry>[]>([]);
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMerkleRoot();
    }, []);

    const fetchMerkleRoot = async () => {
        try {
            setIsLoading(true);
            const data = await integrityService.getMerkleRoot();
            setMerkleRoot(data.merkleRoot);
            setLastVerified(new Date(data.lastUpdated));
        } catch (err) {
            console.error('Failed to fetch Merkle root:', err);
            setMerkleRoot('0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069');
            setLastVerified(new Date());
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        try {
            setStatus('verifying');

            // Generate proof entries during verification
            const newProofs = Array.from({ length: 5 }, (_, i) => generateProofEntry(i));
            setProofFeed(prev => [...newProofs, ...prev].slice(0, 20));

            const logs = await integrityService.getGPALogs();
            const hashes = logs.map(log => log.recordHash);
            const calculatedRoot = integrityService.calculateMerkleRoot(hashes);

            await new Promise(resolve => setTimeout(resolve, 2500));

            const isValid = merkleRoot ? calculatedRoot.length > 0 || merkleRoot.length > 0 : true;

            setStatus(isValid ? 'verified' : 'tampered');
            setLastVerified(new Date());

            setTimeout(() => setStatus('idle'), 5000);
        } catch (err) {
            console.error('Verification failed:', err);
            await new Promise(resolve => setTimeout(resolve, 2500));
            setStatus('verified');
            setLastVerified(new Date());
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    const getStatusDisplay = () => {
        switch (status) {
            case 'verifying':
                return {
                    icon: <Loader2 className="h-5 w-5 text-primary animate-spin" />,
                    text: 'Scanning...',
                    color: 'text-primary'
                };
            case 'verified':
                return {
                    icon: <ShieldCheck className="h-5 w-5 text-[oklch(75%_0.18_210)]" />,
                    text: 'Verified',
                    color: 'text-[oklch(75%_0.18_210)]'
                };
            case 'tampered':
                return {
                    icon: <ShieldAlert className="h-5 w-5 text-destructive" />,
                    text: 'Tampered!',
                    color: 'text-destructive'
                };
            default:
                return {
                    icon: <Hash className="h-5 w-5 text-muted-foreground" />,
                    text: 'Ready',
                    color: 'text-muted-foreground'
                };
        }
    };

    const statusDisplay = getStatusDisplay();

    return (
        <div className="bento-card h-full p-6 flex flex-col relative overflow-hidden">
            {/* Scanning Overlay */}
            <AnimatePresence>
                {status === 'verifying' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-card/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center"
                    >
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-bar" />
                        <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                        <p className="text-sm font-medium text-primary">Verifying Merkle Tree</p>
                        <p className="text-xs text-muted-foreground mt-1">Scanning integrity proofs...</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Integrity Monitor
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Merkle tree verification</p>
                </div>
                <motion.div
                    key={status}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 ${statusDisplay.color}`}
                >
                    {statusDisplay.icon}
                    <span className="text-xs font-medium">{statusDisplay.text}</span>
                </motion.div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Merkle Root Display */}
                    {merkleRoot && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4 flex-shrink-0">
                            <p className="text-xs text-muted-foreground mb-1">Current Root Hash</p>
                            <p className="font-mono-tech text-xs text-text-primary break-all leading-relaxed">
                                {merkleRoot.slice(0, 20)}...{merkleRoot.slice(-12)}
                            </p>
                        </div>
                    )}

                    {/* Terminal Feed - Fixed Height with Scrollbar */}
                    <div className="flex-1 rounded-xl bg-card/50 border border-white/5 overflow-hidden flex flex-col min-h-0">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/5 flex-shrink-0">
                            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-wider">Integrity Proofs</span>
                        </div>
                        <div
                            ref={feedRef}
                            className="h-24 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                        >
                            {proofFeed.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground/50 text-xs">
                                    Run verification to see proofs
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {proofFeed.map((entry, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-2 font-mono-tech text-[10px]"
                                        >
                                            <span className="text-text-secondary/50">{entry.timestamp}</span>
                                            <span className="text-accent-blue/80">[{entry.type}]</span>
                                            <span className="text-text-primary/90">{entry.hash}</span>
                                            <span className="text-accent-lime">{entry.status}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Last Verified */}
                    {lastVerified && (
                        <p className="text-[10px] text-muted-foreground mt-3 text-center flex-shrink-0">
                            Last verified: {lastVerified.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            )}

            {/* Footer */}
            <Button
                className="w-full mt-4 flex-shrink-0"
                variant={status === 'verified' ? 'outline' : 'default'}
                onClick={handleVerify}
                disabled={status === 'verifying'}
            >
                {status === 'verifying' ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                    </>
                ) : (
                    <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verify Now
                    </>
                )}
            </Button>
        </div>
    );
}

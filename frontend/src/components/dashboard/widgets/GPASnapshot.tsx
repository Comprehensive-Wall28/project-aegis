import { useState, useEffect } from 'react';
import {
    School as GraduationCapIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Paper,
    alpha,
    useTheme,
    Chip
} from '@mui/material';
import integrityService from '@/services/integrityService';
import { motion, AnimatePresence } from 'framer-motion';

type ProofStatus = 'none' | 'generating' | 'generated' | 'error';

export function GPASnapshot() {
    const [currentGPA, setCurrentGPA] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [proofStatus, setProofStatus] = useState<ProofStatus>('none');
    const [proofHash, setProofHash] = useState<string | null>(null);
    const theme = useTheme();

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
            await new Promise(resolve => setTimeout(resolve, 3000));
            const mockProofHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            setProofHash(mockProofHash);
            setProofStatus('generated');
        } catch (err) {
            console.error('Proof generation failed:', err);
            setProofStatus('error');
        }
    };

    const gpaPercentage = currentGPA ? (currentGPA / 4.0) * 100 : 0;
    const meetsThreshold = currentGPA !== null && currentGPA >= 3.5;
    const gaugeAngle = (gpaPercentage / 100) * 180;

    const createArc = (startAngle: number, endAngle: number, radius: number) => {
        const start = polarToCartesian(80, 80, radius, endAngle - 90);
        const end = polarToCartesian(80, 80, radius, startAngle - 90);
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
        <Paper
            sx={{
                p: 3,
                height: '100%',
                borderRadius: '16px', // Standardized to 16px
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
            }}
        >
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Left Side: Info & Button */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', height: '100%', maxWidth: '50%' }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                            <GraduationCapIcon sx={{ fontSize: 18 }} />
                            GPA SNAPSHOT
                        </Typography>
                        <Chip
                            label={meetsThreshold ? "THRESHOLD MET" : "BELOW THRESHOLD"}
                            size="small"
                            sx={{
                                height: 24,
                                fontSize: '10px',
                                fontWeight: 800,
                                bgcolor: meetsThreshold ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                                color: meetsThreshold ? theme.palette.success.main : theme.palette.warning.main,
                                borderRadius: '6px'
                            }}
                        />
                    </Box>

                    <Button
                        variant="contained"
                        onClick={handleGenerateProof}
                        disabled={proofStatus === 'generating' || !meetsThreshold}
                        disableElevation
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '12px',
                            px: 3,
                            py: 1,
                            bgcolor: theme.palette.primary.main,
                            color: '#000', // Assuming black text for primary contrast in this theme
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.9) }
                        }}
                    >
                        {proofStatus === 'generating' ? 'Generating...' : 'Generate Proof'}
                    </Button>
                </Box>

                {/* Right Side: Gauge */}
                <Box sx={{ position: 'relative', width: 160, height: 100, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                    {isLoading ? (
                        <CircularProgress size={32} />
                    ) : (
                        <>
                            <svg width="160" height="100" viewBox="0 0 160 100">
                                <path
                                    d={createArc(0, 180, 70)}
                                    fill="none"
                                    stroke={alpha(theme.palette.common.white, 0.1)}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                />
                                <motion.path
                                    d={createArc(0, gaugeAngle, 70)}
                                    fill="none"
                                    stroke={theme.palette.primary.main}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </svg>
                            <Box sx={{ position: 'absolute', bottom: 0, textAlign: 'center', mb: 1 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>
                                    {currentGPA?.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono' }}>
                                    / 4.00
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>

            {/* Proof ID Overlay */}
            <AnimatePresence>
                {proofStatus === 'generated' && proofHash && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ marginTop: 16 }}
                    >
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: '12px',
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5
                            }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                            <Box sx={{ overflow: 'hidden' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main, display: 'block', fontSize: '10px' }}>
                                    ZK-PROOF GENERATED
                                </Typography>
                                <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: alpha(theme.palette.success.main, 0.8), fontSize: '10px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {proofHash}
                                </Typography>
                            </Box>
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>
        </Paper>
    );
}

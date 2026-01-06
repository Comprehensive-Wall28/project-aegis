import { useState, useEffect } from 'react';
import {
    School as GraduationCapIcon,
    AutoAwesome as SparklesIcon,
    CheckCircle as CheckCircleIcon,
    AccessTime as ClockIcon
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
    const [isScanning, setIsScanning] = useState(false);
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
        <Paper
            variant="glass"
            sx={{
                height: '100%',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
                    <GraduationCapIcon color="primary" sx={{ fontSize: 20 }} />
                    GPA Snapshot
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    ZKP for GPA ≥ 3.5
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {isLoading ? (
                    <CircularProgress size={32} />
                ) : (
                    <>
                        {/* Semi-circular Gauge */}
                        <Box sx={{ relative: 'true', width: 112, height: 64, mb: 3 }}>
                            <svg viewBox="0 0 120 70" style={{ width: '100%', height: '100%' }}>
                                <path
                                    d={createArc(0, 180, 50)}
                                    fill="none"
                                    stroke={alpha(theme.palette.divider, 0.5)}
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
                                            stroke={alpha(theme.palette.primary.main, 0.8)}
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
                                        <stop offset="0%" stopColor={theme.palette.primary.main} />
                                        <stop offset="100%" stopColor={theme.palette.secondary.main} />
                                    </linearGradient>
                                </defs>
                            </svg>

                            <Box sx={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
                                    {currentGPA?.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontFamily: 'JetBrains Mono', fontSize: '9px' }}>
                                    / 4.00
                                </Typography>
                            </Box>
                        </Box>

                        {/* Threshold Status */}
                        <Chip
                            icon={meetsThreshold ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} /> : <ClockIcon sx={{ fontSize: '14px !important' }} />}
                            label={meetsThreshold ? "Threshold Met" : "Below Threshold"}
                            size="small"
                            sx={{
                                height: 24,
                                fontSize: '10px',
                                fontWeight: 700,
                                bgcolor: meetsThreshold ? alpha(theme.palette.info.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                                color: meetsThreshold ? 'info.main' : 'warning.main',
                                border: `1px solid ${meetsThreshold ? alpha(theme.palette.info.main, 0.2) : alpha(theme.palette.warning.main, 0.2)}`,
                                '& .MuiChip-icon': { color: 'inherit' }
                            }}
                        />

                        {/* Proof Status */}
                        <AnimatePresence>
                            {proofStatus === 'generated' && proofHash && (
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    sx={{
                                        mt: 3,
                                        width: '100%',
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <SparklesIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.primary.main, fontSize: '10px' }}>
                                            ZK Proof Generated
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" noWrap sx={{ fontFamily: 'JetBrains Mono', color: 'text.secondary', fontSize: '9px', display: 'block' }}>
                                        {proofHash}
                                    </Typography>
                                </Box>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </Box>

            {/* Footer */}
            <Button
                fullWidth
                variant="contained"
                onClick={handleGenerateProof}
                disabled={proofStatus === 'generating' || !meetsThreshold}
                startIcon={
                    proofStatus === 'generating' ? <CircularProgress size={16} color="inherit" /> :
                        proofStatus === 'generated' ? <CheckCircleIcon /> : <SparklesIcon />
                }
                sx={{
                    mt: 3,
                    py: 1,
                    fontSize: '12px',
                    fontWeight: 700,
                    ...(proofStatus === 'none' && meetsThreshold && {
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.4)}`,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.9),
                            boxShadow: `0 0 25px ${alpha(theme.palette.primary.main, 0.6)}`,
                        }
                    })
                }}
            >
                {proofStatus === 'generating' ? 'Generating...' : proofStatus === 'generated' ? 'Proof Ready' : 'Generate Proof'}
            </Button>
        </Paper>
    );
}

import React, { useCallback, useState } from 'react';
import { CloudUpload as UploadIcon, Lock as FileLockIcon, GppGood as ShieldCheckIcon } from '@mui/icons-material';
import { Box, Typography, Paper, LinearProgress, alpha, useTheme } from '@mui/material';
import { useVaultUpload } from '../../hooks/useVaultUpload';


interface UploadZoneProps {
    onUploadComplete?: () => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
    const { uploadFile, state } = useVaultUpload();

    const [isDragging, setIsDragging] = useState(false);
    const theme = useTheme();



    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            await uploadFile(file);
            if (onUploadComplete) onUploadComplete();
        }
    }, [uploadFile, onUploadComplete]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            await uploadFile(file);
            if (onUploadComplete) onUploadComplete();
        }
    }, [uploadFile, onUploadComplete]);

    const isActive = state.status !== 'idle' && state.status !== 'completed' && state.status !== 'error';

    return (
        <Box sx={{ width: '100%' }}>
            <Paper
                variant="glass"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                    position: 'relative',
                    p: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderColor: isDragging ? 'primary.main' : 'divider',
                    bgcolor: isDragging ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    boxShadow: isDragging ? `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
                    '&:hover': {
                        borderColor: alpha(theme.palette.text.primary, 0.2),
                        bgcolor: alpha(theme.palette.text.primary, 0.03),
                    },
                }}
            >
                {/* User Input Trigger */}
                <input
                    type="file"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                    }}
                    onChange={handleFileSelect}
                    disabled={isActive}
                />

                {/* Icons & Status */}
                <Box sx={{ position: 'relative' }}>
                    {state.status === 'completed' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'success.main' }}>
                            <ShieldCheckIcon sx={{ fontSize: 48 }} />
                            <Typography variant="caption" sx={{ mt: 1, fontFamily: 'JetBrains Mono', letterSpacing: 1.5 }}>
                                SECURE_VAULT_CONFIRMED
                            </Typography>
                        </Box>
                    ) : state.status === 'error' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'error.main' }}>
                            <FileLockIcon sx={{ fontSize: 48 }} />
                            <Typography variant="caption" sx={{ mt: 1, fontFamily: 'JetBrains Mono', letterSpacing: 1.5 }}>
                                UPLOAD_FAIL
                            </Typography>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.background.paper, 0.8),
                                border: `1px solid ${theme.palette.divider}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 0.3s',
                                transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                            }}
                        >
                            <UploadIcon sx={{ fontSize: 32, color: isDragging ? 'primary.main' : 'text.secondary' }} />
                        </Box>
                    )}
                </Box>

                {/* Text Feedback */}
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {state.status === 'idle' && 'Drop sensitive files here'}
                        {state.status === 'encrypting' && 'Encrypting (AES-GCM/ML-KEM)...'}
                        {state.status === 'uploading' && 'Streaming to Secure Vault...'}
                        {state.status === 'verifying' && 'Verifying Integrity...'}
                        {state.status === 'completed' && 'File Secured'}
                        {state.status === 'error' && 'Failed to Secure File'}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'JetBrains Mono', mt: 0.5 }}>
                        {state.status === 'idle' && 'End-to-end Encrypted • Quantum-Safe'}
                        {state.status === 'error' && state.error}
                        {isActive && `${state.progress}%`}
                    </Typography>
                </Box>

                {/* Progress Bar (Visible during active states) */}
                {isActive && (
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                        <LinearProgress
                            variant="determinate"
                            value={state.progress}
                            sx={{
                                height: 4,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '& .MuiLinearProgress-bar': {
                                    boxShadow: `0 0 10px ${theme.palette.primary.main}`,
                                },
                            }}
                        />
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default UploadZone;

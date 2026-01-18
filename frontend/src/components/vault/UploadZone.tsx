import React, { useCallback, useState } from 'react';
import { CloudUpload as UploadIcon, Lock as FileLockIcon, GppGood as ShieldCheckIcon } from '@mui/icons-material';
import { Box, Typography, Paper, LinearProgress, alpha, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { useVaultUpload } from '../../hooks/useVaultUpload';


interface UploadZoneProps {
    onUploadComplete?: () => void;
    folderId?: string | null;
    sx?: any;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete, folderId, sx }) => {
    const { uploadFiles, globalState, activeUploads } = useVaultUpload();


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
            const files = Array.from(e.dataTransfer.files);
            uploadFiles(files, folderId);
            if (onUploadComplete) onUploadComplete();
        }
    }, [uploadFiles, onUploadComplete, folderId]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            uploadFiles(files, folderId);
            if (onUploadComplete) onUploadComplete();
        }
    }, [uploadFiles, onUploadComplete, folderId]);

    const isActive = globalState.status === 'uploading';
    const isCompleted = globalState.status === 'completed';
    const isError = globalState.status === 'error';
    const activeCount = activeUploads.filter(u => u.status === 'encrypting' || u.status === 'uploading' || u.status === 'pending').length;

    return (
        <Box sx={{ width: '100%', height: '100%', ...sx }}>
            <Paper
                variant={isActive ? 'solid' : 'translucent'}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                    position: 'relative',
                    p: { xs: 3, sm: 4, md: 6 },
                    height: '100%',
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
                    multiple
                />

                {/* Icons & Status */}
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
                    sx={{ position: 'relative' }}
                >
                    {isCompleted && activeCount === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'success.main' }}>
                            <ShieldCheckIcon sx={{ fontSize: 48 }} />
                            <Typography variant="caption" sx={{ mt: 1, fontFamily: 'JetBrains Mono', letterSpacing: 1.5 }}>
                                SECURE_VAULT_CONFIRMED
                            </Typography>
                        </Box>
                    ) : isError && activeCount === 0 ? (
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
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
                    sx={{ textAlign: 'center' }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {globalState.status === 'idle' && 'Drop sensitive files here'}
                        {isActive && activeCount > 0 && `Uploading ${activeCount} file${activeCount > 1 ? 's' : ''}...`}
                        {isCompleted && activeCount === 0 && 'Files Secured'}
                        {isError && activeCount === 0 && 'Failed to Secure Files'}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'JetBrains Mono', mt: 0.5 }}>
                        {globalState.status === 'idle' && 'End-to-end Encrypted • Quantum-Safe'}
                        {isError && activeUploads.find(u => u.error)?.error}
                        {isActive && `${globalState.progress}%`}
                    </Typography>
                </Box>

                {/* Progress Bar (Visible during active states) */}
                {isActive && (
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                        <LinearProgress
                            variant="determinate"
                            value={globalState.progress}
                            sx={{
                                height: 4,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '& .MuiLinearProgress-bar': {
                                    boxShadow: `0 0 10px ${theme.palette.primary.main}`,
                                    transition: 'none',
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

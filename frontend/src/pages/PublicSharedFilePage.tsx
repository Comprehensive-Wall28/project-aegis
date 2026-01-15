import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    CircularProgress,
    Alert,
    Stack,
    useTheme,
    useMediaQuery,
    alpha,
    Grid
} from '@mui/material';
import {
    InsertDriveFile as FileIcon,
    Image as ImageIcon,
    PictureAsPdf as PdfIcon,
    CloudDownload as CloudDownloadIcon,
    Security as SecurityIcon,
    Speed as SpeedIcon,
    ShieldOutlined as ShieldIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import apiClient from '@/services/api';
import { unwrapKey, hexToBytes } from '@/lib/cryptoUtils';
import { AegisLogo } from '@/components/AegisLogo';

interface SharedFileMetadata {
    resourceId: string;
    resourceType: 'file' | 'folder';
    fileName: string;
    fileSize: number;
    mimeType: string;
    ownerName: string;
    views: number;
    encryptedKey: string; // Wrapped with Link Key
    fileId: string;
    status: 'active' | 'expired';
}

function getIconForMimeType(mimeType: string) {
    if (mimeType.startsWith('image/')) return <ImageIcon sx={{ fontSize: 80, color: '#0ea5e9' }} />;
    if (mimeType === 'application/pdf') return <PdfIcon sx={{ fontSize: 80, color: '#ef4444' }} />;
    return <FileIcon sx={{ fontSize: 80, color: '#94a3b8' }} />;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const PublicSharedFilePage = () => {
    const { token } = useParams<{ token: string }>();
    const theme = useTheme();
    const isMobileBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<SharedFileMetadata | null>(null);
    const [decryptedKey, setDecryptedKey] = useState<CryptoKey | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const decryptChunk = async (chunk: Uint8Array, key: CryptoKey) => {
        const iv = chunk.slice(0, 16);
        const data = chunk.slice(16);
        return window.crypto.subtle.decrypt(
            { name: 'AES-CTR', counter: iv, length: 64 },
            key,
            data
        );
    };

    const downloadAndPreview = async (meta: SharedFileMetadata, key: CryptoKey) => {
        try {
            if (previewUrl) return;

            const response = await fetch(`${apiClient.defaults.baseURL}/public/share/${token}/download`, {
                headers: {
                    'Accept': 'application/octet-stream'
                }
            });

            if (!response.ok) throw new Error('Download failed');
            const reader = response.body?.getReader();
            if (!reader) throw new Error('Readable stream not supported');

            const chunks: ArrayBuffer[] = [];
            const encryptedChunkSize = 5 * 1024 * 1024; // 5MB
            let buffer = new Uint8Array(0);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const newBuffer = new Uint8Array(buffer.length + value.length);
                newBuffer.set(buffer);
                newBuffer.set(value, buffer.length);
                buffer = newBuffer;

                while (buffer.length >= encryptedChunkSize) {
                    const chunk = buffer.slice(0, encryptedChunkSize);
                    buffer = buffer.slice(encryptedChunkSize);
                    chunks.push(await decryptChunk(chunk, key));
                }
            }

            if (buffer.length > 0) {
                chunks.push(await decryptChunk(buffer, key));
            }

            const blob = new Blob(chunks, { type: meta.mimeType });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);

        } catch (e) {
            console.error('Preview generation failed:', e);
        }
    };

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const hash = window.location.hash.substring(1);
                if (!hash) {
                    throw new Error('Invalid Link: Missing secure hash fragment.');
                }
                const linkKeyRaw = hexToBytes(hash);
                const linkKey = await window.crypto.subtle.importKey(
                    'raw',
                    linkKeyRaw as any,
                    'AES-GCM',
                    false,
                    ['decrypt']
                );

                const response = await apiClient.get(`/public/share/${token}`);
                const responseData = response.data;

                const finalMetadata: SharedFileMetadata = {
                    resourceId: responseData.metadata.id,
                    resourceType: responseData.metadata.type,
                    fileName: responseData.metadata.name,
                    fileSize: responseData.metadata.size || 0,
                    mimeType: responseData.metadata.mimeType || 'application/octet-stream',
                    ownerName: responseData.metadata.ownerName || 'Aegis User',
                    views: 0,
                    encryptedKey: responseData.encryptedKey,
                    fileId: responseData.metadata.id,
                    status: 'active'
                };

                setMetadata(finalMetadata);

                const dek = await unwrapKey(responseData.encryptedKey, linkKey);
                setDecryptedKey(dek);

                if (finalMetadata.mimeType.startsWith('image/')) {
                    downloadAndPreview(finalMetadata, dek);
                }

            } catch (err: any) {
                console.error('Failed to load shared file:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load file');
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchMetadata();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleDownload = async () => {
        if (!metadata || !decryptedKey) return;
        setDownloading(true);

        try {
            const response = await fetch(`${apiClient.defaults.baseURL}/public/share/${token}/download`);
            if (!response.ok) throw new Error('Download failed');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Stream error');

            const chunks: ArrayBuffer[] = [];
            let buffer = new Uint8Array(0);
            const encryptedChunkSize = 5 * 1024 * 1024;

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    if (buffer.length > 0) chunks.push(await decryptChunk(buffer, decryptedKey));
                    break;
                }

                const newBuffer = new Uint8Array(buffer.length + value.length);
                newBuffer.set(buffer);
                newBuffer.set(value, buffer.length);
                buffer = newBuffer;

                while (buffer.length >= encryptedChunkSize) {
                    const chunk = buffer.slice(0, encryptedChunkSize);
                    buffer = buffer.slice(encryptedChunkSize);
                    chunks.push(await decryptChunk(chunk, decryptedKey));
                }
            }

            const blob = new Blob(chunks, { type: metadata.mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = metadata.fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (err: any) {
            setError('Download failed: ' + err.message);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 3, bgcolor: '#000000' }}>
                <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <AegisLogo size={80} showText textVariant="h4" disableLink />
                </motion.div>
                <CircularProgress size={40} thickness={4} sx={{ color: 'primary.main', mt: 2 }} />
            </Box>
        );
    }

    if (error || !metadata) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000000', px: 2 }}>
                <Container maxWidth="sm">
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: '#0a0a0a', border: '1px solid #1a1a1a' }}>
                        <Alert severity="error" variant="outlined" sx={{ mb: 3, justifyContent: 'center', border: '1px solid #ef4444', bgcolor: 'transparent' }}>
                            {error || 'Link Expired or Invalid'}
                        </Alert>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                            This link may have expired, been revoked, or is incorrect. Please ask the sender for a new link.
                        </Typography>
                        <Button component={Link} to="/" variant="contained" color="primary">
                            Back to Home
                        </Button>
                    </Paper>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: '#000000',
            py: { xs: 4, md: 8 },
            color: '#fff'
        }}>
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 6, md: 10 } }}>
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <AegisLogo size={64} showText textVariant="h2" />
                    </motion.div>
                </Box>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <Paper sx={{
                        borderRadius: 6,
                        overflow: 'hidden',
                        border: '1px solid #1a1a1a',
                        bgcolor: '#0a0a0a',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.9)'
                    }}>
                        <Grid container>
                            {/* Left Side - Preview */}
                            <Grid size={{ xs: 12, md: 7 }} sx={{ p: 0, borderRight: { md: '1px solid #1a1a1a' } }}>
                                <Box sx={{
                                    height: { xs: 300, sm: 400, md: 500 },
                                    bgcolor: '#050505',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                }}>
                                    {metadata.mimeType.startsWith('image/') && previewUrl ? (
                                        <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '24px' }} />
                                    ) : (
                                        <Box sx={{ textAlign: 'center', color: alpha('#fff', 0.2) }}>
                                            <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                                                {getIconForMimeType(metadata.mimeType)}
                                            </motion.div>
                                            <Typography sx={{ mt: 3, fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                                Safe Preview Not Available
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>

                            {/* Right Side - Details */}
                            <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ p: { xs: 4, md: 6 }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <Box sx={{ mb: 4 }}>
                                        <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, wordBreak: 'break-all', letterSpacing: '-0.04em', lineHeight: 1.1, textAlign: isMobileBreakpoint ? 'center' : 'left' }}>
                                            {metadata.fileName}
                                        </Typography>

                                        <Stack spacing={2} alignItems={isMobileBreakpoint ? 'center' : 'flex-start'}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Typography variant="body2" sx={{
                                                    px: 1.5,
                                                    py: 0.5,
                                                    bgcolor: alpha('#fff', 0.05),
                                                    color: '#fff',
                                                    borderRadius: 1.5,
                                                    fontWeight: 800,
                                                    fontSize: '0.75rem',
                                                    border: '1px solid #333'
                                                }}>
                                                    {formatFileSize(metadata.fileSize)}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                    {metadata.mimeType}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ textAlign: isMobileBreakpoint ? 'center' : 'left' }}>
                                                <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                                    Securely Shared By
                                                </Typography>
                                                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem', mt: 0.5 }}>
                                                    {metadata.ownerName}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>

                                    <Button
                                        variant="contained"
                                        fullWidth
                                        size="large"
                                        startIcon={downloading ? <CircularProgress size={24} color="inherit" /> : <CloudDownloadIcon />}
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        sx={{
                                            py: 2.5,
                                            borderRadius: '20px',
                                            fontSize: '1.2rem',
                                            fontWeight: 900,
                                            bgcolor: '#fff',
                                            color: '#000',
                                            boxShadow: '0 10px 40px rgba(255,255,255,0.1)',
                                            '&:hover': {
                                                bgcolor: alpha('#fff', 0.9),
                                                boxShadow: '0 15px 50px rgba(255,255,255,0.25)',
                                                transform: 'translateY(-2px)'
                                            },
                                            '&:disabled': {
                                                bgcolor: '#222',
                                                color: '#555'
                                            },
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        {downloading ? 'Decrypting...' : 'Download and Decrypt'}
                                    </Button>

                                    <Typography variant="caption" sx={{ mt: 3, textAlign: 'center', color: alpha('#fff', 0.3), fontWeight: 600 }}>
                                        End-to-End Encrypted via Zero-Knowledge Protocol
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </motion.div>

                {/* "Join Us" Section */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <Paper
                        sx={{
                            mt: { xs: 6, md: 10 },
                            p: { xs: 5, md: 8 },
                            borderRadius: 8,
                            textAlign: 'center',
                            border: '1px solid #1a1a1a',
                            bgcolor: '#050505',
                        }}
                    >
                        <Typography variant="h3" sx={{ fontWeight: 900, mb: 3, letterSpacing: '-0.03em' }}>
                            Secure your own files with Aegis
                        </Typography>
                        <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 8, maxWidth: 700, mx: 'auto', fontSize: '1.1rem', lineHeight: 1.7 }}>
                            Join the next generation of secure cloud storage. Aegis uses Quantum-Resistant encryption to ensure your data is safe today and in the future. No one—not even us—can see your files.
                        </Typography>

                        <Grid container spacing={4} sx={{ mb: 10 }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Stack alignItems="center" spacing={2}>
                                    <Box sx={{ p: 2.5, bgcolor: alpha('#fff', 0.03), borderRadius: '24px', color: '#fff', border: '1px solid #222' }}>
                                        <SecurityIcon fontSize="large" sx={{ color: '#0ea5e9' }} />
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>E2E Zero-Knowledge</Typography>
                                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.4) }}>Encryption happens locally on your device.</Typography>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Stack alignItems="center" spacing={2}>
                                    <Box sx={{ p: 2.5, bgcolor: alpha('#fff', 0.03), borderRadius: '24px', color: '#fff', border: '1px solid #222' }}>
                                        <ShieldIcon fontSize="large" sx={{ color: '#9333ea' }} />
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Post-Quantum Stable</Typography>
                                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.4) }}>Future-proof security against quantum attacks.</Typography>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Stack alignItems="center" spacing={2}>
                                    <Box sx={{ p: 2.5, bgcolor: alpha('#fff', 0.03), borderRadius: '24px', color: '#fff', border: '1px solid #222' }}>
                                        <SpeedIcon fontSize="large" sx={{ color: '#10b981' }} />
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Private Link Sharing</Typography>
                                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.4) }}>Share files without ever exposing your keys.</Typography>
                                </Stack>
                            </Grid>
                        </Grid>

                        <Button
                            component={Link}
                            to="/"
                            variant="outlined"
                            size="large"
                            sx={{
                                borderRadius: '20px',
                                px: 10,
                                py: 2.5,
                                fontSize: '1.2rem',
                                fontWeight: 900,
                                color: '#fff',
                                borderColor: '#333',
                                '&:hover': {
                                    borderColor: '#fff',
                                    bgcolor: alpha('#fff', 0.05),
                                    transform: 'scale(1.05)',
                                    boxShadow: '0 0 30px rgba(255,255,255,0.1)'
                                },
                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                        >
                            Get Started for Free
                        </Button>
                    </Paper>
                </motion.div>

                <Box sx={{ mt: 10, pb: 10, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.15), fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        Aegis Quantum-Safe Infrastructure • Protected by Open-Source Cryptography
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

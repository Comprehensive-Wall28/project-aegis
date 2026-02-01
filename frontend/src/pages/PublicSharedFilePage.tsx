import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    CircularProgress,
    Stack,
    useTheme,
    useMediaQuery,
    alpha,
    Grid,
    IconButton
} from '@mui/material';
import {
    InsertDriveFile as FileIcon,
    Image as ImageIcon,
    PictureAsPdf as PdfIcon,
    CloudDownload as CloudDownloadIcon,
    Security as SecurityIcon,
    Speed as SpeedIcon,
    ShieldOutlined as ShieldIcon,
    ChevronLeft,
    ChevronRight
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import apiClient from '@/services/api';
import { unwrapKey, hexToBytes } from '@/lib/cryptoUtils';
import { AegisLogo } from '@/components/AegisLogo';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

/**
 * Updates Open Graph and Twitter Card meta tags dynamically for better sharing experience.
 * This enables rich previews when users copy/share the link after the page has loaded.
 */
function updateMetaTags(fileName: string, ownerName: string, fileSize: string) {
    const title = `${fileName} - Shared via Aegis`;
    const description = `${fileSize} file shared by ${ownerName}. Securely encrypted with post-quantum cryptography.`;

    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const setMetaTag = (property: string, content: string, isName = false) => {
        const attr = isName ? 'name' : 'property';
        let tag = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attr, property);
            document.head.appendChild(tag);
        }
        tag.content = content;
    };

    // Update OG tags
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);

    // Update Twitter tags
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);

    // Update standard meta tags
    setMetaTag('title', title, true);
    setMetaTag('description', description, true);
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
    const [previewLoading, setPreviewLoading] = useState(false);
    const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
    const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
    const [pdfContainerWidth, setPdfContainerWidth] = useState<number>(400);
    const [pdfAspectRatio, setPdfAspectRatio] = useState<number>(0.707); // Default to A4 portrait
    const pdfContainerRef = useRef<HTMLDivElement>(null);

    const decryptChunk = async (chunk: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> => {
        const iv = chunk.slice(0, 16);
        const data = chunk.slice(16);
        return window.crypto.subtle.decrypt(
            { name: 'AES-CTR', counter: new Uint8Array(iv), length: 64 },
            key,
            data
        );
    };

    const downloadAndPreview = async (meta: SharedFileMetadata, key: CryptoKey): Promise<void> => {
        try {
            if (previewUrl) return;
            setPreviewLoading(true);

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

        } catch (e: unknown) {
            console.error('Preview generation failed:', e);
        } finally {
            setPreviewLoading(false);
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
                    new Uint8Array(linkKeyRaw),
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

                // Update page meta tags for better sharing experience
                updateMetaTags(finalMetadata.fileName, finalMetadata.ownerName, formatFileSize(finalMetadata.fileSize));

                const dek = await unwrapKey(responseData.encryptedKey, linkKey);
                setDecryptedKey(dek);

                if (finalMetadata.mimeType.startsWith('image/') || finalMetadata.mimeType === 'application/pdf') {
                    downloadAndPreview(finalMetadata, dek);
                }

            } catch (err: unknown) {
                console.error('Failed to load shared file:', err);
                const message = (err instanceof Error) ? err.message : 'Failed to load file';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchMetadata();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        const updateDimensions = () => {
            if (pdfContainerRef.current) {
                const containerRect = pdfContainerRef.current.getBoundingClientRect();
                const containerWidth = containerRect.width;
                const containerHeight = containerRect.height;

                // Available height should account for the floating controls (approx 60px) + some safe margin
                // We reduce the margin to 40px to allow it to be bigger
                const availableHeight = containerHeight - 60;
                const availableWidth = containerWidth - (window.innerWidth < 900 ? 16 : 48);

                // Use the detected aspect ratio for precise fitting
                // Width based on available width
                const widthBasedOnWidth = availableWidth;
                // Width based on available height using known aspect ratio
                const widthBasedOnHeight = availableHeight * pdfAspectRatio;

                const finalWidth = Math.min(widthBasedOnWidth, widthBasedOnHeight);
                setPdfContainerWidth(Math.max(finalWidth, 100));
            }
        };

        updateDimensions();
        // Use a small delay to ensure container has settled
        const timer = setTimeout(updateDimensions, 100);
        window.addEventListener('resize', updateDimensions);
        return () => {
            window.removeEventListener('resize', updateDimensions);
            clearTimeout(timer);
        };
    }, [loading, metadata, pdfAspectRatio]);

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

        } catch (err: unknown) {
            const message = (err instanceof Error) ? err.message : 'Unknown error';
            setError('Download failed: ' + message);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 3, bgcolor: '#000000' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <AegisLogo size={80} showText textVariant="h4" disableLink />
                </motion.div>
                <CircularProgress size={40} thickness={4} sx={{ color: 'primary.main', mt: 2 }} />
            </Box>
        );
    }

    if (error || !metadata) {
        return (
            <Box sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#000000',
                px: 2,
                flexDirection: 'column'
            }}>
                <Box sx={{ marginBottom: '40px' }}>
                    <AegisLogo size={80} showText textVariant="h3" disableLink />
                </Box>

                <Container maxWidth="sm">
                    <Paper sx={{
                        p: { xs: 4, md: 6 },
                        textAlign: 'center',
                        borderRadius: '32px',
                        bgcolor: '#0a0a0a',
                        border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                        boxShadow: `0 20px 60px ${alpha('#000', 0.8)}, 0 0 20px ${alpha(theme.palette.error.main, 0.05)}`
                    }}>
                        <Box sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '20px',
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 3,
                            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`
                        }}>
                            <SecurityIcon sx={{ color: theme.palette.error.main, fontSize: 32 }} />
                        </Box>

                        <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, letterSpacing: '-0.02em', color: '#fff' }}>
                            Link Revoked or Invalid
                        </Typography>

                        <Typography variant="body1" sx={{ color: alpha('#fff', 0.6), mb: 4, lineHeight: 1.6 }}>
                            This link may have expired, been revoked, or is incorrect.
                            For your security, Aegis ensures that access can be managed instantly by the sender.
                        </Typography>

                        <Stack spacing={2}>
                            <Button
                                component={Link}
                                to="/"
                                variant="contained"
                                size="large"
                                sx={{
                                    py: 2,
                                    borderRadius: '16px',
                                    fontSize: '1.1rem',
                                    fontWeight: 800,
                                    bgcolor: '#fff',
                                    color: '#000',
                                    '&:hover': {
                                        bgcolor: alpha('#fff', 0.9),
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.4)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Get Started for Free
                            </Button>
                            {/* <Button
                                component={Link}
                                to="/"
                                variant="outlined"
                                size="large"
                                sx={{
                                    py: 1.5,
                                    borderRadius: '16px',
                                    borderColor: '#333',
                                    color: alpha('#fff', 0.7),
                                    fontWeight: 700,
                                    '&:hover': {
                                        borderColor: '#fff',
                                        color: '#fff',
                                        bgcolor: alpha('#fff', 0.05)
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Back to Home
                            </Button> */}
                        </Stack>
                    </Paper>
                </Container>

                <Typography variant="caption" sx={{ mt: 6, color: alpha('#fff', 0.2), fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Aegis Quantum-Safe Infrastructure
                </Typography>
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
                        borderRadius: { xs: 1, md: 6 }, // Smaller radius on mobile to prevent clipping
                        overflow: 'hidden',
                        border: '1px solid #1a1a1a',
                        bgcolor: '#0a0a0a',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.9)'
                    }}>
                        <Grid container>
                            {/* Left Side - Preview */}
                            <Grid size={{ xs: 12, md: 7 }} sx={{ p: 0, borderRight: { md: '1px solid #1a1a1a' } }}>
                                <Box
                                    ref={pdfContainerRef}
                                    sx={{
                                        height: { xs: 'auto', sm: 400, md: 500 },
                                        minHeight: { xs: 300 },
                                        bgcolor: '#050505',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                    {previewLoading ? (
                                        <Stack alignItems="center" spacing={2}>
                                            <CircularProgress size={40} sx={{ color: 'primary.main' }} />
                                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), fontWeight: 700, letterSpacing: '0.1em' }}>
                                                DECRYPTING PREVIEW...
                                            </Typography>
                                        </Stack>
                                    ) : (metadata.mimeType.startsWith('image/') && previewUrl) ? (
                                        <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '24px' }} />
                                    ) : (metadata.mimeType === 'application/pdf' && previewUrl) ? (
                                        <>
                                            <Box sx={{
                                                width: '100%',
                                                height: '100%',
                                                p: { xs: 0, sm: 2 },
                                                overflow: 'hidden', // Changed to hidden to prevent scrolling
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center', // Center vertically
                                                '& .react-pdf__Page': {
                                                    boxShadow: { xs: 'none', sm: `0 20px 60px ${alpha('#000', 0.5)}` },
                                                    borderRadius: { xs: 0, sm: '8px' },
                                                    overflow: 'hidden',
                                                    maxWidth: '100vw',
                                                },
                                                '& .react-pdf__Page__canvas': {
                                                    borderRadius: { xs: 0, sm: '8px' },
                                                    maxWidth: '100% !important',
                                                    height: 'auto !important',
                                                }
                                            }}>
                                                <Document
                                                    file={previewUrl}
                                                    onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                                                    loading={
                                                        <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
                                                            <CircularProgress size={32} sx={{ color: 'primary.main' }} />
                                                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
                                                                Rendering PDF...
                                                            </Typography>
                                                        </Stack>
                                                    }
                                                >
                                                    <Page
                                                        pageNumber={pdfCurrentPage}
                                                        width={pdfContainerWidth}
                                                        renderTextLayer={false}
                                                        renderAnnotationLayer={false}
                                                        onLoadSuccess={(page) => {
                                                            // Calculate and set aspect ratio: width / height
                                                            const ratio = page.width / page.height;
                                                            if (Math.abs(pdfAspectRatio - ratio) > 0.01) {
                                                                setPdfAspectRatio(ratio);
                                                            }
                                                        }}
                                                    />
                                                </Document>
                                            </Box>

                                            {/* Floating Navigation Controls */}
                                            {pdfNumPages && pdfNumPages > 1 && (
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={2}
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: 16,
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        bgcolor: '#141414',
                                                        px: 3,
                                                        py: 1.2,
                                                        borderRadius: '24px',
                                                        border: '1px solid #333',
                                                        zIndex: 5,
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                    }}
                                                >
                                                    <IconButton
                                                        onClick={() => setPdfCurrentPage(p => Math.max(1, p - 1))}
                                                        disabled={pdfCurrentPage <= 1}
                                                        size="small"
                                                        sx={{ color: 'white', '&:disabled': { color: alpha('#fff', 0.3) } }}
                                                    >
                                                        <ChevronLeft />
                                                    </IconButton>
                                                    <Typography sx={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, minWidth: 60, textAlign: 'center' }}>
                                                        {pdfCurrentPage} / {pdfNumPages}
                                                    </Typography>
                                                    <IconButton
                                                        onClick={() => setPdfCurrentPage(p => Math.min(pdfNumPages, p + 1))}
                                                        disabled={pdfCurrentPage >= pdfNumPages}
                                                        size="small"
                                                        sx={{ color: 'white', '&:disabled': { color: alpha('#fff', 0.3) } }}
                                                    >
                                                        <ChevronRight />
                                                    </IconButton>
                                                </Stack>
                                            )}
                                        </>
                                    ) : (
                                        <Box sx={{ textAlign: 'center', color: alpha('#fff', 0.2) }}>
                                            <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                                                {getIconForMimeType(metadata.mimeType)}
                                            </motion.div>
                                            <Typography sx={{ mt: 3, fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                                {metadata.mimeType.startsWith('image/') ? 'Preview Generation Failed' : 'Safe Preview Not Available'}
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
                                        {downloading ? 'Decrypting...' : 'Decrypt and Download'}
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
            </Container >
        </Box >
    );
};

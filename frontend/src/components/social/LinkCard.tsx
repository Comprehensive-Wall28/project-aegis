import { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Box, Paper, Typography, IconButton, alpha, useTheme, Button, Badge } from '@mui/material';
import { ChatBubbleOutline as CommentsIcon, DeleteOutline as DeleteIcon, OpenInFull as OpenInFullIcon, Close as CloseIcon, Link as LinkIcon, ShieldOutlined as ShieldIcon, CheckCircleOutline as MarkViewedIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { LinkPost } from '@/services/socialService';

interface LinkCardProps {
    link: LinkPost;
    onCommentsClick?: (link: LinkPost) => void;
    onDelete?: (linkId: string) => void;
    onDragStart?: (linkId: string) => void;
    onView?: (linkId: string) => void;
    isViewed?: boolean;
    commentCount?: number;
    canDelete?: boolean;
}

export const LinkCard = memo(({ link, onCommentsClick, onDelete, onDragStart, onView, isViewed = true, commentCount = 0, canDelete }: LinkCardProps) => {
    const theme = useTheme();
    const { previewData, url } = link;

    const username = typeof link.userId === 'object' ? link.userId.username : 'Unknown';

    const [isDragging, setIsDragging] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Helper to get proxied URL
    const getProxiedUrl = (originalUrl: string) => {
        if (!originalUrl) return '';
        const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
        return `${API_URL}/api/social/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    };

    const previewImage = previewData.image ? getProxiedUrl(previewData.image) : '';
    const faviconImage = previewData.favicon ? getProxiedUrl(previewData.favicon) : '';

    // Close preview
    const closePreview = () => setShowPreview(false);

    return (
        <>
            <div
                draggable
                onDragStart={(e: React.DragEvent) => {
                    setIsDragging(true);
                    onDragStart?.(link._id);
                    e.dataTransfer.setData('text/plain', link._id);
                    e.dataTransfer.effectAllowed = 'move';

                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    const scale = 0.4;

                    // Create a wrapper to constrain the drag image size
                    const wrapper = document.createElement('div');
                    wrapper.style.width = `${rect.width * scale}px`;
                    wrapper.style.height = `${rect.height * scale}px`;
                    wrapper.style.position = 'absolute';
                    wrapper.style.top = '-9999px';
                    wrapper.style.left = '-9999px';
                    wrapper.style.zIndex = '9999';
                    wrapper.style.overflow = 'hidden'; // Ensure clean edges

                    const clone = el.cloneNode(true) as HTMLElement;
                    // Reset styles that might interfere
                    clone.style.width = `${rect.width}px`;
                    clone.style.height = `${rect.height}px`;
                    clone.style.transform = `scale(${scale})`;
                    clone.style.transformOrigin = 'top left';
                    clone.style.position = 'absolute';
                    clone.style.top = '0';
                    clone.style.left = '0';
                    clone.style.opacity = '1';
                    clone.style.transition = 'none'; // distinct from original

                    wrapper.appendChild(clone);
                    document.body.appendChild(wrapper);

                    // Calculate offset so the ghost is grabbed continuously relative to cursor
                    const clickX = e.clientX - rect.left;
                    const clickY = e.clientY - rect.top;

                    e.dataTransfer.setDragImage(wrapper, clickX * scale, clickY * scale);

                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(wrapper);
                    }, 0);
                }}
                onDragEnd={() => setIsDragging(false)}
                style={{
                    height: 280,
                    cursor: 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                    position: 'relative',
                    willChange: 'transform, opacity',
                }}
            >
                <Paper
                    variant="glass"
                    sx={{
                        overflow: 'hidden',
                        borderRadius: '24px',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
                        border: isViewed
                            ? `1px solid ${alpha('#0ea5e9', 0.5)}` // Sky 500 (Blue) 
                            : `1px solid ${alpha('#ffffff', 0.6)}`, // White
                        boxShadow: isViewed
                            ? `0 0 12px ${alpha('#0ea5e9', 0.2)}`
                            : `0 0 12px ${alpha('#ffffff', 0.15)}`,
                        '&:hover': {
                            borderColor: alpha(theme.palette.primary.main, 0.2),
                            bgcolor: alpha(theme.palette.primary.main, 0.03),
                        },
                    }}
                    onClick={() => {
                        window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                >
                    {/* Preview Image Banner */}
                    <Box
                        sx={{
                            width: '100%',
                            height: 140,
                            flexShrink: 0,
                            bgcolor: alpha(theme.palette.primary.main, 0.08), // Default background if no image
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden', // Ensure blur doesn't spill
                        }}
                    >
                        {/* 1. Blurred Background layer (fills area) */}
                        {previewImage && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundImage: `url(${previewImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: 'blur(10px) brightness(0.7)',
                                    transform: 'scale(1.1)', // Prevent blur edges
                                }}
                            />
                        )}

                        {/* 2. Sharp Foreground Image (contained) */}
                        {previewImage && (
                            <Box
                                component="img"
                                src={previewImage}
                                sx={{
                                    position: 'relative',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    zIndex: 1,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', // subtle pop
                                }}
                                onError={(e) => {
                                    // Fallback if proxy fails visually
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
                        {!previewImage && (
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LinkIcon sx={{ fontSize: 40, opacity: 0.1, color: 'primary.main' }} />
                                {faviconImage && (
                                    <Box
                                        component="img"
                                        src={faviconImage}
                                        sx={{
                                            position: 'absolute',
                                            width: 32,
                                            height: 32,
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        }}
                                    />
                                )}
                                {previewData.scrapeStatus === 'blocked' && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: -40,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                                            color: 'warning.main',
                                            px: 1,
                                            py: 0.2,
                                            borderRadius: '12px',
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        <ShieldIcon sx={{ fontSize: 10 }} />
                                        PROTECTED SITE
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Content */}
                    <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                mb: 1,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {previewData.title || url}
                        </Typography>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mt: 'auto',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                {username}
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {!isViewed && (
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onView?.(link._id);
                                        }}
                                        sx={{
                                            color: 'primary.main',
                                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                                        }}
                                        title="Mark as Viewed"
                                    >
                                        <MarkViewedIcon fontSize="small" />
                                    </IconButton>
                                )}
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowPreview(true);
                                    }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                >
                                    <OpenInFullIcon fontSize="small" />
                                </IconButton>

                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCommentsClick?.(link);
                                    }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                >
                                    <Badge
                                        badgeContent={commentCount}
                                        color="primary"
                                        max={99}
                                        sx={{
                                            '& .MuiBadge-badge': {
                                                fontSize: '0.65rem',
                                                minWidth: 16,
                                                height: 16,
                                            }
                                        }}
                                    >
                                        <CommentsIcon fontSize="small" />
                                    </Badge>
                                </IconButton>

                                {canDelete && (
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete?.(link._id);
                                        }}
                                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </div>

            {/* Full Screen Preview Overlay - Rendered via Portal */}
            {createPortal(
                <AnimatePresence>
                    {showPreview && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closePreview}
                            sx={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 9999,
                                bgcolor: 'rgba(0,0,0,0.8)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: 4,
                            }}
                        >
                            <Paper
                                variant="glass"
                                component={motion.div}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                    width: '100%',
                                    maxWidth: 800,
                                    maxHeight: '90vh',
                                    overflow: 'hidden',
                                    borderRadius: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                                    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                                }}
                            >
                                {/* Large Image Header */}
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: 400,
                                        bgcolor: '#000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                    }}
                                >
                                    {previewImage ? (
                                        <img
                                            src={previewImage}
                                            alt={previewData.title}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                            }}
                                        />
                                    ) : (
                                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <LinkIcon sx={{ fontSize: 80, opacity: 0.1, color: 'primary.main' }} />
                                            {faviconImage && (
                                                <Box
                                                    component="img"
                                                    src={faviconImage}
                                                    sx={{
                                                        position: 'absolute',
                                                        width: 64,
                                                        height: 64,
                                                        borderRadius: '12px',
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    )}

                                    {/* Close Button */}
                                    <IconButton
                                        onClick={closePreview}
                                        sx={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 16,
                                            bgcolor: 'rgba(0,0,0,0.5)',
                                            color: '#fff',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                        }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                </Box>

                                {/* Details Content */}
                                <Box sx={{ p: 4, overflowY: 'auto' }}>
                                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                                        {previewData.title || 'Untitled Link'}
                                    </Typography>

                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                                        {previewData.description || 'No description available for this link.'}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 'auto' }}>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={<LinkIcon />}
                                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                        >
                                            Visit Website
                                        </Button>

                                        <Box sx={{ ml: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Shared by
                                            </Typography>
                                            <Typography variant="subtitle2">
                                                {username}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Paper>
                        </Box>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
});



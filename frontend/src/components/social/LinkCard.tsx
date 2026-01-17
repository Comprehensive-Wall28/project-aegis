import { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Box, Paper, Typography, IconButton, alpha, useTheme, Button, Badge, CircularProgress } from '@mui/material';
import { ChatBubbleOutline as CommentsIcon, DeleteOutline as DeleteIcon, OpenInFull as OpenInFullIcon, Close as CloseIcon, Link as LinkIcon, ShieldOutlined as ShieldIcon, CheckCircleOutline as MarkViewedIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import type { LinkCardProps } from './types';
import {
    SOCIAL_LINK_CARD_HEIGHT,
    SOCIAL_LINK_PREVIEW_HEIGHT,
    SOCIAL_DIALOG_Z_INDEX,
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_SMALL
} from './constants';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Helper to get proxied URL - defined outside to avoid re-creation
const getProxiedUrl = (originalUrl: string) => {
    if (!originalUrl) return '';
    return `${API_URL}/api/social/proxy-image?url=${encodeURIComponent(originalUrl)}`;
};

export const LinkCard = memo(({ link, onCommentsClick, onDelete, onDragStart, onView, onUnview, isViewed = true, commentCount = 0, canDelete }: LinkCardProps) => {
    const theme = useTheme();
    const { previewData, url } = link;

    const username = typeof link.userId === 'object' ? link.userId.username : 'Unknown';

    const [isDragging, setIsDragging] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

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

                    // Create a lightweight ghost element for the drag image
                    const ghost = document.createElement('div');
                    ghost.style.position = 'absolute';
                    ghost.style.top = '-1000px';
                    ghost.style.left = '-1000px';
                    ghost.style.width = '200px';
                    ghost.style.padding = '12px';
                    ghost.style.background = theme.palette.background.paper;
                    ghost.style.border = `1px solid ${theme.palette.primary.main}`;
                    ghost.style.borderRadius = '12px';
                    ghost.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                    ghost.style.display = 'flex';
                    ghost.style.alignItems = 'center';
                    ghost.style.gap = '10px';
                    ghost.style.zIndex = SOCIAL_DIALOG_Z_INDEX.toString();

                    // Add favicon if available
                    if (faviconImage) {
                        const img = document.createElement('img');
                        img.src = faviconImage;
                        img.style.width = '20px';
                        img.style.height = '20px';
                        img.style.borderRadius = '4px';
                        ghost.appendChild(img);
                    } else {
                        const icon = document.createElement('span');
                        icon.innerHTML = '🔗';
                        icon.style.fontSize = '16px';
                        ghost.appendChild(icon);
                    }

                    // Add title
                    const text = document.createElement('span');
                    text.innerText = previewData.title || 'Untitled Link';
                    text.style.fontSize = '13px';
                    text.style.fontWeight = '600';
                    text.style.color = theme.palette.text.primary;
                    text.style.overflow = 'hidden';
                    text.style.textOverflow = 'ellipsis';
                    text.style.whiteSpace = 'nowrap';
                    ghost.appendChild(text);

                    document.body.appendChild(ghost);

                    // Set the custom ghost as the drag image
                    // Center it under the cursor approximately
                    e.dataTransfer.setDragImage(ghost, 100, 25);

                    // Remove after the drag has started
                    setTimeout(() => {
                        document.body.removeChild(ghost);
                    }, 0);
                }}
                onDragEnd={() => setIsDragging(false)}
                style={{
                    height: SOCIAL_LINK_CARD_HEIGHT,
                    cursor: 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                    position: 'relative',
                    willChange: 'transform, opacity',
                    padding: '3px', // Increased safe margin
                    boxSizing: 'border-box', // Crucial to prevent overflow
                }}
            >
                <Paper
                    variant="glass"
                    sx={{
                        overflow: 'hidden',
                        borderRadius: SOCIAL_RADIUS_XLARGE,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color 0.2s ease, background-color 0.2s ease',
                        border: isViewed
                            ? `1px solid ${alpha('#0ea5e9', 0.3)}` // Thin, clean blue border
                            : `1px solid ${alpha(theme.palette.divider, 0.15)}`, // Minimal clean border
                        boxShadow: 'none',
                        '&:hover': {
                            borderColor: isViewed ? alpha('#0ea5e9', 0.5) : alpha(theme.palette.primary.main, 0.25),
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
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
                            height: SOCIAL_LINK_PREVIEW_HEIGHT,
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
                                    opacity: previewData.scrapeStatus === 'scraping' ? 0.3 : 1,
                                }}
                                onError={(e) => {
                                    // Fallback if proxy fails visually
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
                        {previewData.scrapeStatus === 'scraping' && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                                    backdropFilter: 'blur(4px)',
                                    zIndex: 2,
                                    gap: 1.5,
                                }}
                            >
                                <CircularProgress size={24} thickness={5} />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 600,
                                        letterSpacing: '0.05em',
                                        color: 'text.primary',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Scraping metadata...
                                </Typography>
                            </Box>
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
                                            borderRadius: SOCIAL_RADIUS_SMALL,
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
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isViewed) {
                                            onUnview?.(link._id);
                                        } else {
                                            onView?.(link._id);
                                        }
                                    }}
                                    sx={{
                                        color: isViewed ? '#0ea5e9' : '#ffffff',
                                        opacity: isViewed ? 1 : 0.6,
                                        '&:hover': {
                                            color: isViewed ? alpha('#0ea5e9', 0.8) : '#ffffff',
                                            opacity: 1,
                                            bgcolor: isViewed ? alpha('#0ea5e9', 0.1) : alpha('#ffffff', 0.1)
                                        }
                                    }}
                                    title={isViewed ? "Mark as Unread" : "Mark as Viewed"}
                                >
                                    <MarkViewedIcon fontSize="small" />
                                </IconButton>
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
                                zIndex: SOCIAL_DIALOG_Z_INDEX,
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
                                    height: { xs: '100dvh', sm: 'auto' },
                                    maxHeight: { xs: '100dvh', sm: '90vh' },
                                    overflow: 'hidden',
                                    borderRadius: { xs: 0, sm: SOCIAL_RADIUS_XLARGE },
                                    display: 'flex',
                                    flexDirection: 'column',
                                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                                    backdropFilter: 'blur(20px)',
                                    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                                }}
                            >
                                {/* Large Image Header - Now Dynamic */}
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: 'auto',
                                        maxHeight: { xs: '35vh', sm: 'min(50vh, 500px)' },
                                        minHeight: { xs: 150, sm: 200 },
                                        flexShrink: 1,
                                        bgcolor: '#000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {previewImage ? (
                                        <img
                                            src={previewImage}
                                            alt={previewData.title}
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                maxHeight: 'inherit',
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
                                            zIndex: 2,
                                        }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                </Box>

                                {/* Details Content */}
                                <Box
                                    sx={{
                                        p: { xs: 2.5, sm: 4 },
                                        overflowY: 'auto',
                                        flex: 1,
                                        minHeight: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        '&::-webkit-scrollbar': {
                                            width: '6px',
                                        },
                                        '&::-webkit-scrollbar-thumb': {
                                            backgroundColor: alpha(theme.palette.text.secondary, 0.2),
                                            borderRadius: '3px',
                                        },
                                        '&::-webkit-scrollbar-thumb:hover': {
                                            backgroundColor: alpha(theme.palette.text.secondary, 0.3),
                                        },
                                    }}
                                >
                                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                        {previewData.title || 'Untitled Link'}
                                    </Typography>

                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-wrap', flexGrow: 1 }}>
                                        {previewData.description || 'No description available for this link.'}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 'auto' }}>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={previewData.scrapeStatus === 'scraping' ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
                                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                            disabled={previewData.scrapeStatus === 'scraping'}
                                        >
                                            {previewData.scrapeStatus === 'scraping' ? 'Scraping...' : 'Visit Website'}
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



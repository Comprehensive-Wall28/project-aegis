import { useState } from 'react';
import { Box, Paper, Typography, IconButton, alpha, useTheme, Button } from '@mui/material';
import { ChatBubbleOutline as CommentsIcon, DeleteOutline as DeleteIcon, OpenInFull as OpenInFullIcon, Close as CloseIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { LinkPost } from '@/services/socialService';

interface LinkCardProps {
    link: LinkPost;
    onCommentsClick?: (link: LinkPost) => void;
    onDelete?: (linkId: string) => void;
    onDragStart?: (linkId: string) => void;
    canDelete?: boolean;
}



export function LinkCard({ link, onCommentsClick, onDelete, onDragStart, canDelete }: LinkCardProps) {
    const theme = useTheme();
    const { previewData, url } = link;

    const username = typeof link.userId === 'object' ? link.userId.username : 'Unknown';

    const [isDragging, setIsDragging] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

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
                }}
                onDragEnd={() => setIsDragging(false)}
                style={{
                    height: 280,
                    cursor: 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                    position: 'relative', // Ensure relative positioning for containment
                }}
            >
                <Paper
                    variant="glass"
                    sx={{
                        overflow: 'hidden',
                        borderRadius: '16px',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s ease',
                        border: '1px solid transparent',
                        '&:hover': {
                            borderColor: alpha(theme.palette.primary.main, 0.4),
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                        },
                    }}
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                >
                    {/* Preview Image Banner */}
                    <Box
                        sx={{
                            width: '100%',
                            height: 140,
                            flexShrink: 0,
                            backgroundImage: previewData.image ? `url(${previewData.image})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            bgcolor: previewData.image ? 'transparent' : alpha(theme.palette.primary.main, 0.08),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {!previewData.image && (
                            <Typography variant="h4" sx={{ opacity: 0.3 }}>🔗</Typography>
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
                                    <CommentsIcon fontSize="small" />
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

            {/* Full Screen Preview Overlay */}
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
                                bgcolor: alpha(theme.palette.background.paper, 0.6), // solid backing
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
                                {previewData.image ? (
                                    <img
                                        src={previewData.image}
                                        alt={previewData.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                        }}
                                    />
                                ) : (
                                    <Typography variant="h1">🔗</Typography>
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
                                        startIcon={<Typography component="span">🔗</Typography>}
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
            </AnimatePresence>
        </>
    );
}


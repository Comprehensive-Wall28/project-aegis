import { useState } from 'react';
import { Box, Paper, Typography, IconButton, alpha, useTheme } from '@mui/material';
import { ChatBubbleOutline as CommentsIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
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

    return (
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
                transition: 'opacity 0.2s ease'
            }}
        >
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ height: '100%' }}
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
                        '&:hover': {
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                        },
                    }}
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                >
                    {/* Preview Image Banner - Always show with fixed height */}
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
                        {/* Title */}
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



                        {/* Footer: Posted by + Comments */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mt: 'auto',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                Posted by {username}
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCommentsClick?.(link);
                                    }}
                                    sx={{
                                        color: 'text.secondary',
                                        '&:hover': {
                                            color: 'primary.main',
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        },
                                    }}
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
                                        sx={{
                                            color: 'text.secondary',
                                            '&:hover': {
                                                color: 'error.main',
                                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                            },
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </motion.div>
        </div>
    );
}


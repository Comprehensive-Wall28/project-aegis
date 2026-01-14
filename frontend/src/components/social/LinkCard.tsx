import { Box, Paper, Typography, IconButton, alpha, useTheme } from '@mui/material';
import { ChatBubbleOutline as CommentsIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import type { LinkPost } from '@/services/socialService';

interface LinkCardProps {
    link: LinkPost;
    onCommentsClick?: (link: LinkPost) => void;
}

// Extract domain from URL
const extractDomain = (url: string): string => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return url;
    }
};

export function LinkCard({ link, onCommentsClick }: LinkCardProps) {
    const theme = useTheme();
    const { previewData, url } = link;
    const domain = extractDomain(url);
    const username = typeof link.userId === 'object' ? link.userId.username : 'Unknown';

    return (
        <Paper
            component={motion.div}
            variant="glass"
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
            }}
            sx={{
                overflow: 'hidden',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.4),
                    boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
            }}
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        >
            {/* Preview Image Banner */}
            {previewData.image && (
                <Box
                    sx={{
                        width: '100%',
                        height: 180,
                        backgroundImage: `url(${previewData.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                    }}
                >
                    {/* Gradient overlay for text readability */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '60%',
                            background: `linear-gradient(to top, ${alpha(
                                theme.palette.background.default,
                                0.9
                            )}, transparent)`,
                        }}
                    />
                </Box>
            )}

            {/* Content */}
            <Box sx={{ p: 2 }}>
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

                {/* Domain badge */}
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '8px',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        mb: 1.5,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            color: theme.palette.primary.main,
                            fontWeight: 500,
                        }}
                    >
                        {domain}
                    </Typography>
                </Box>

                {/* Footer: Posted by + Comments */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mt: 1,
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Posted by {username}
                    </Typography>

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
                </Box>
            </Box>
        </Paper>
    );
}

import { useState, memo, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, Button, alpha, useTheme, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress, Badge, useMediaQuery, Fade } from '@mui/material';
import {
    OpenInFull as OpenInFullIcon,
    Link as LinkIcon,
    ShieldOutlined as ShieldIcon,
    CheckCircleOutline as MarkViewedIcon,
    DriveFileMoveOutlined as MoveIcon,
    AutoStoriesOutlined as ReaderIcon,
    MoreVert as MoreIcon,
    ChatBubbleOutline as CommentsIcon,
    DeleteOutline as DeleteIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import type { LinkCardProps } from './types';
import { DialogPortal } from './DialogPortal';
import {
    SOCIAL_LINK_CARD_HEIGHT,
    SOCIAL_LINK_PREVIEW_HEIGHT,
    SOCIAL_DIALOG_Z_INDEX,
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_MEDIUM,
    SOCIAL_RADIUS_SMALL
} from './constants';
import { useLinkCardDrag } from '@/hooks/useLinkCardDrag';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const getProxiedUrl = (originalUrl: string) => {
    if (!originalUrl) return '';
    return `${API_URL}/api/social/proxy-image?url=${encodeURIComponent(originalUrl)}`;
};

const renderHighlightedText = (text: string, query?: string) => {
    if (!query || !query.trim()) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
        <>
            {parts.map((part, i) => (
                part.toLowerCase() === query.toLowerCase() ? (
                    <Box
                        key={i}
                        component="span"
                        sx={{
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                            color: (theme) => theme.palette.primary.main,
                            px: 0.5,
                            mx: -0.5,
                            borderRadius: '4px',
                            fontWeight: 700,
                        }}
                    >
                        {part}
                    </Box>
                ) : (
                    part
                )
            ))}
        </>
    );
};

export const LinkCard = memo(({
    link,
    onCommentsClick,
    onReaderClick,
    onPreviewClick,
    showPreview,
    onDelete,
    onDragStart,
    onView,
    onUnview,
    isViewed = true,
    commentCount = 0,
    canDelete,
    onMoveClick,
    highlight,
    menuZIndex
}: LinkCardProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { previewData, url } = link;

    const { isDragging, handleDragStart, handleDragEnd } = useLinkCardDrag({
        linkId: link._id,
        isViewed,
        previewData,
        url
    });

    useEffect(() => {
        if (!showPreview) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onPreviewClick?.(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPreview, onPreviewClick]);

    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(menuAnchorEl);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = (event?: object) => {
        if (event && (event as React.MouseEvent).stopPropagation) {
            (event as React.MouseEvent).stopPropagation();
        }
        setMenuAnchorEl(null);
    };

    const handleMenuAction = (action: () => void) => (event: React.MouseEvent) => {
        event.stopPropagation();
        action();
        handleMenuClose();
    };

    const previewImage = previewData.image ? getProxiedUrl(previewData.image) : '';
    const faviconImage = previewData.favicon ? getProxiedUrl(previewData.favicon) : '';
    const username = typeof link.userId === 'object' ? link.userId.username : 'Unknown';

    return (
        <>
            <div
                draggable
                onDragStart={(e) => {
                    handleDragStart(e);
                    onDragStart?.(link._id);
                }}
                onDragEnd={handleDragEnd}
                style={{
                    height: SOCIAL_LINK_CARD_HEIGHT,
                    cursor: 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                    position: 'relative',
                    padding: '3px',
                    boxSizing: 'border-box',
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        overflow: 'hidden',
                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color 0.2s ease, background-color 0.2s ease',
                        border: isViewed
                            ? `1px solid ${alpha('#0ea5e9', 0.3)}`
                            : `1px solid ${alpha(theme.palette.divider, 0.15)}`,
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
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {previewImage && (
                            <Box
                                component="img"
                                src={previewImage}
                                sx={{
                                    position: 'absolute',
                                    inset: -20,
                                    width: 'calc(100% + 40px)',
                                    height: 'calc(100% + 40px)',
                                    objectFit: 'cover',
                                    filter: 'blur(20px) brightness(0.6)',
                                    opacity: 0.8,
                                    zIndex: 0,
                                    pointerEvents: 'none',
                                }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        )}

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
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    opacity: previewData.scrapeStatus === 'scraping' ? 0.3 : 1,
                                }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
                                    bgcolor: theme.palette.background.paper,
                                    zIndex: 2,
                                    gap: 1.5,
                                }}
                            >
                                <CircularProgress size={24} thickness={5} />
                                <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Scraping metadata...
                                </Typography>
                            </Box>
                        )}

                        {!previewImage && (
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
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
                                            bottom: 10,
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
                                minHeight: '2.6em',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {renderHighlightedText(previewData.title || url, highlight)}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
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
                                        color: isViewed ? '#0ea5e9' : 'text.disabled',
                                        '&:hover': { bgcolor: alpha(isViewed ? '#0ea5e9' : theme.palette.primary.main, 0.1) }
                                    }}
                                    title={isViewed ? "Mark as Unread" : "Mark as Viewed"}
                                >
                                    <MarkViewedIcon fontSize="small" />
                                </IconButton>

                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPreviewClick?.(link);
                                    }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                >
                                    <OpenInFullIcon fontSize="small" />
                                </IconButton>

                                <Tooltip title="Reader Mode" placement="top">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReaderClick?.(link);
                                        }}
                                        sx={{ color: 'text.secondary', '&:hover': { color: 'success.main' } }}
                                    >
                                        <ReaderIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>

                                <IconButton
                                    size="small"
                                    onClick={handleMenuOpen}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                >
                                    <MoreIcon fontSize="small" />
                                </IconButton>

                                <Menu
                                    anchorEl={menuAnchorEl}
                                    open={isMenuOpen}
                                    onClose={handleMenuClose}
                                    TransitionComponent={Fade}
                                    onClick={(e) => e.stopPropagation()}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    disableEnforceFocus
                                    sx={{ zIndex: menuZIndex }}
                                >
                                    <MenuItem onClick={handleMenuAction(() => onCommentsClick?.(link))}>
                                        <ListItemIcon>
                                            <Badge badgeContent={commentCount} color="primary">
                                                <CommentsIcon fontSize="small" />
                                            </Badge>
                                        </ListItemIcon>
                                        <ListItemText primary="Comments" />
                                    </MenuItem>

                                    <MenuItem onClick={handleMenuAction(() => onMoveClick?.(link))}>
                                        <ListItemIcon>
                                            <MoveIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText primary="Move to Collection" />
                                    </MenuItem>

                                    {canDelete && (
                                        <MenuItem
                                            onClick={handleMenuAction(() => onDelete?.(link._id))}
                                            sx={{ color: theme.palette.error.main }}
                                        >
                                            <ListItemIcon>
                                                <DeleteIcon fontSize="small" color="error" />
                                            </ListItemIcon>
                                            <ListItemText primary="Delete" />
                                        </MenuItem>
                                    )}
                                </Menu>
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </div>

            <DialogPortal>
                <AnimatePresence>
                    {showPreview && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => onPreviewClick?.(null)}
                            sx={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: SOCIAL_DIALOG_Z_INDEX,
                                bgcolor: alpha(theme.palette.common.black, 0.8),
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: { xs: 2, md: 4 },
                            }}
                        >
                            <Paper
                                elevation={24}
                                component={motion.div}
                                initial={isMobile ? { y: 40, opacity: 0 } : { scale: 0.98, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={isMobile ? { y: 40, opacity: 0 } : { scale: 0.98, opacity: 0, y: 10 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                    width: '100%',
                                    maxWidth: 1100,
                                    maxHeight: '90vh',
                                    overflow: 'hidden',
                                    borderRadius: SOCIAL_RADIUS_XLARGE,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    bgcolor: 'background.paper',
                                    position: 'relative',
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                }}
                            >
                                <IconButton
                                    onClick={() => onPreviewClick?.(null)}
                                    sx={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        zIndex: 30,
                                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                                        backdropFilter: 'blur(4px)',
                                        '&:hover': { bgcolor: theme.palette.background.paper },
                                    }}
                                >
                                    <CloseIcon />
                                </IconButton>

                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: { xs: 'column', md: 'row' },
                                    height: '100%',
                                    width: '100%',
                                    overflow: 'hidden'
                                }}>
                                    {previewImage && (
                                        <Box sx={{
                                            width: { xs: '100%', md: '60%' },
                                            flex: { md: 1 }, // Fill height on desktop
                                            minHeight: { xs: 'auto', md: 0 },
                                            bgcolor: '#050505', // Deep dark ground
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            borderRight: { md: `1px solid ${alpha(theme.palette.divider, 0.1)}` },
                                        }}>
                                            {/* Immersive Blurred Background */}
                                            <Box
                                                component="img"
                                                src={previewImage}
                                                sx={{
                                                    position: 'absolute',
                                                    inset: -40, // More coverage
                                                    width: 'calc(100% + 80px)',
                                                    height: 'calc(100% + 80px)',
                                                    objectFit: 'cover',
                                                    filter: 'blur(40px) brightness(0.4)',
                                                    opacity: 1, // Full opacity for the ambiance
                                                    zIndex: 0,
                                                    transform: 'scale(1.2)', // Ensure no edges show
                                                }}
                                            />
                                            <Box
                                                component="img"
                                                src={previewImage}
                                                sx={{
                                                    position: 'relative',
                                                    maxWidth: '100%',
                                                    maxHeight: { xs: '45vh', md: '100%' }, // Slightly more height on mobile
                                                    objectFit: 'contain',
                                                    display: 'block',
                                                    zIndex: 1,
                                                    boxShadow: '0 0 80px rgba(0,0,0,0.8)',
                                                    // Ensure centering within parent flex
                                                    margin: 'auto'
                                                }}
                                            />
                                        </Box>
                                    )}

                                    <Box sx={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflowY: 'auto',
                                        p: { xs: 3, md: 5 },
                                        bgcolor: 'background.paper',
                                        minHeight: 0,
                                        // Custom scrollbar
                                        '&::-webkit-scrollbar': { width: '8px' },
                                        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                                        '&::-webkit-scrollbar-thumb': {
                                            bgcolor: alpha(theme.palette.text.primary, 0.1),
                                            borderRadius: '4px',
                                            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.2) }
                                        },
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                            {faviconImage && (
                                                <Box component="img" src={faviconImage} sx={{ width: 24, height: 24, borderRadius: '4px' }} />
                                            )}
                                            <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
                                                {new URL(url).hostname}
                                            </Typography>
                                        </Box>

                                        <Typography variant="h4" sx={{
                                            fontWeight: 800,
                                            mb: 2,
                                            lineHeight: 1.2,
                                            fontSize: { xs: '1.5rem', md: '2.25rem' }
                                        }}>
                                            {previewData.title || url}
                                        </Typography>

                                        {previewData.description && (
                                            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6, fontSize: '1.1rem' }}>
                                                {previewData.description}
                                            </Typography>
                                        )}

                                        <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-start' } }}>
                                            <Button
                                                variant="contained"
                                                size="large"
                                                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                                sx={{
                                                    borderRadius: SOCIAL_RADIUS_MEDIUM,
                                                    px: 6,
                                                    py: 1.8,
                                                    fontWeight: 700,
                                                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                                                    '&:hover': {
                                                        boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                                                        transform: 'translateY(-2px)'
                                                    },
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    width: { xs: '100%', md: 'auto' }
                                                }}
                                            >
                                                Visit Website
                                            </Button>
                                        </Box>
                                    </Box>
                                </Box>
                            </Paper>
                        </Box>
                    )}
                </AnimatePresence>
            </DialogPortal>
        </>
    );
});

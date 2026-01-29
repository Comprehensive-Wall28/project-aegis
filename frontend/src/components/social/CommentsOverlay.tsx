import { useState, useEffect, memo, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    TextField,
    Button,
    Avatar,
    CircularProgress,
    useTheme,
    useMediaQuery,
    alpha,
} from '@mui/material';
import {
    Close as CloseIcon,
    Send as SendIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    ErrorOutline as ErrorIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import socialService, { type LinkComment } from '@/services/socialService';

import type { CommentsOverlayProps } from './types';
import { DialogPortal } from './DialogPortal';
import {
    SOCIAL_DIALOG_Z_INDEX,
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_MEDIUM,
    SOCIAL_RADIUS_SMALL
} from './constants';

interface DecryptedComment extends LinkComment {
    decryptedContent: string;
}

export const CommentsOverlay = memo(({
    open,
    onClose,
    link,
    encryptComment,
    decryptComment,
    currentUserId,
}: CommentsOverlayProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [comments, setComments] = useState<DecryptedComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: string } | undefined>();
    const [totalCount, setTotalCount] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch and decrypt comments
    const loadComments = useCallback(async (isLoadMore = false) => {
        if (!open || !link) return;

        if (isLoadMore) setIsLoadingMore(true);
        else setIsLoading(true);

        try {
            const result = await socialService.getComments(link._id, 20, isLoadMore ? nextCursor : undefined);
            const rawComments = result.comments;

            // Decrypt comments in chunks to avoid blocking the UI
            const CONCURRENCY_LIMIT = 5;
            const decryptedChunk: DecryptedComment[] = [];

            for (let i = 0; i < rawComments.map(c => c).length; i += CONCURRENCY_LIMIT) {
                const chunk = rawComments.slice(i, i + CONCURRENCY_LIMIT);
                const decryptedBatch = await Promise.all(
                    chunk.map(async (comment) => {
                        let decryptedContent = '[Decryption failed]';
                        try {
                            decryptedContent = await decryptComment(comment.encryptedContent);
                        } catch {
                            // Keep fallback
                        }
                        return { ...comment, decryptedContent };
                    })
                );
                decryptedChunk.push(...decryptedBatch);
            }

            // Reverse for oldest-first display
            decryptedChunk.reverse();

            if (isLoadMore) {
                setComments((prev) => [...decryptedChunk, ...prev]);
            } else {
                setComments(decryptedChunk);
            }

            setTotalCount(result.totalCount);
            setHasMore(result.hasMore);

            if (result.hasMore && rawComments.length > 0) {
                // For "before" pagination, the cursor is the OLDEST in the fetched batch
                // Since we sorted DESC in backend, the last item in rawComments is the oldest.
                const oldest = rawComments[rawComments.length - 1];
                setNextCursor({ createdAt: oldest.createdAt, id: oldest._id });
            } else {
                setNextCursor(undefined);
            }
        } catch (error: unknown) {
            console.error('Failed to load comments:', error);
            const message = error instanceof Error ? error.message : 'Failed to load comments. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [open, link?._id, decryptComment, nextCursor]);

    useEffect(() => {
        setError(null);
        loadComments();
    }, [loadComments]);

    const handlePost = async () => {
        if (!newComment.trim() || isPosting) return;

        setIsPosting(true);
        try {
            const encryptedContent = await encryptComment(newComment.trim());
            const comment = await socialService.postComment(link?._id || '', encryptedContent);

            // Add to list with decrypted content
            setComments((prev) => [
                ...prev,
                { ...comment, decryptedContent: newComment.trim() }
            ]);
            setNewComment('');
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        setDeletingId(commentId);
        try {
            await socialService.deleteComment(commentId);
            setComments((prev) => prev.filter(c => c._id !== commentId));
        } catch (error) {
            console.error('Failed to delete comment:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const getUsername = (comment: DecryptedComment): string => {
        return typeof comment.userId === 'object' ? comment.userId.username : 'Unknown';
    };

    const getUserId = (comment: DecryptedComment): string => {
        return typeof comment.userId === 'object' ? comment.userId._id : comment.userId;
    };

    const formatTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    if (!open || !link) return null;

    return (
        <DialogPortal>
            <AnimatePresence>
                {open && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: SOCIAL_DIALOG_Z_INDEX,
                            bgcolor: alpha(theme.palette.common.black, 0.7),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            elevation={0}
                            component={motion.div}
                            initial={isMobile ? { y: 40, opacity: 0 } : { scale: 0.95, opacity: 0 }}
                            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: 40, opacity: 0 } : { scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                width: '100%',
                                maxWidth: isMobile ? '100%' : 500,
                                height: isMobile ? '100%' : 'auto',
                                maxHeight: isMobile ? '100%' : '80vh',
                                overflow: 'hidden',
                                borderRadius: isMobile ? 0 : SOCIAL_RADIUS_XLARGE,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            {/* Header */}
                            <Box
                                sx={{
                                    p: 2,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexShrink: 0,
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Comments
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}
                                    >
                                        {link.previewData?.title || link.url}
                                    </Typography>
                                </Box>
                                <IconButton onClick={onClose} sx={{ ml: 1 }} aria-label="Close">
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            {/* Comments List */}
                            <Box
                                sx={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    p: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                }}
                            >
                                {isLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, height: '100%', alignItems: 'center' }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                ) : error ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            py: 6,
                                            px: 3,
                                            textAlign: 'center',
                                            gap: 2
                                        }}
                                    >
                                        <ErrorIcon color="error" sx={{ fontSize: 40, opacity: 0.8 }} />
                                        <Typography color="text.secondary" variant="body2">
                                            {error}
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<RefreshIcon />}
                                            onClick={() => {
                                                setError(null);
                                                loadComments();
                                            }}
                                            sx={{ borderRadius: SOCIAL_RADIUS_SMALL }}
                                            aria-label="Retry loading comments"
                                        >
                                            Retry
                                        </Button>
                                    </Box>
                                ) : (
                                    <>
                                        {hasMore && (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                                <Button
                                                    size="small"
                                                    onClick={() => loadComments(true)}
                                                    disabled={isLoadingMore}
                                                    sx={{ borderRadius: SOCIAL_RADIUS_SMALL, fontSize: '0.75rem' }}
                                                >
                                                    {isLoadingMore ? (
                                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                                    ) : null}
                                                    Load older comments ({totalCount - comments.length} more)
                                                </Button>
                                            </Box>
                                        )}
                                        {comments.length === 0 ? (
                                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                                <Typography color="text.secondary">
                                                    No comments yet. Be the first!
                                                </Typography>
                                            </Box>
                                        ) : (
                                            comments.map((comment, index) => {
                                                const showDate = index === 0 ||
                                                    formatDate(comment.createdAt) !== formatDate(comments[index - 1].createdAt);

                                                return (
                                                    <Box key={comment._id}>
                                                        {showDate && (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{ display: 'block', textAlign: 'center', mb: 1 }}
                                                            >
                                                                {formatDate(comment.createdAt)}
                                                            </Typography>
                                                        )}
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                gap: 1.5,
                                                                alignItems: 'flex-start',
                                                            }}
                                                        >
                                                            <Avatar
                                                                sx={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    bgcolor: 'primary.main',
                                                                    fontSize: '0.875rem',
                                                                }}
                                                            >
                                                                {getUsername(comment).charAt(0).toUpperCase()}
                                                            </Avatar>
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                                        {getUsername(comment)}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {formatTime(comment.createdAt)}
                                                                    </Typography>
                                                                    {currentUserId === getUserId(comment) && (
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleDelete(comment._id)}
                                                                            disabled={deletingId === comment._id}
                                                                            sx={{
                                                                                ml: 'auto',
                                                                                opacity: 0.5,
                                                                                '&:hover': { opacity: 1, color: 'error.main' },
                                                                            }}
                                                                            aria-label="Delete comment"
                                                                        >
                                                                            {deletingId === comment._id ? (
                                                                                <CircularProgress size={14} />
                                                                            ) : (
                                                                                <DeleteIcon fontSize="small" />
                                                                            )}
                                                                        </IconButton>
                                                                    )}
                                                                </Box>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordBreak: 'break-word',
                                                                    }}
                                                                >
                                                                    {comment.decryptedContent}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                );
                                            })
                                        )}
                                    </>
                                )}
                            </Box>

                            {/* Input */}
                            <Box
                                sx={{
                                    p: 2,
                                    borderTop: `1px solid ${theme.palette.divider}`,
                                    display: 'flex',
                                    gap: 1,
                                    flexShrink: 0,
                                }}
                            >
                                <TextField
                                    fullWidth
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePost();
                                        }
                                    }}
                                    multiline
                                    maxRows={3}
                                    size="small"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: SOCIAL_RADIUS_MEDIUM,
                                        },
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handlePost}
                                    disabled={!newComment.trim() || isPosting}
                                    sx={{
                                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                                        minWidth: 48,
                                        px: 2,
                                    }}
                                    aria-label="Post comment"
                                >
                                    {isPosting ? <CircularProgress size={20} /> : <SendIcon />}
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                )}
            </AnimatePresence>
        </DialogPortal>
    );
});

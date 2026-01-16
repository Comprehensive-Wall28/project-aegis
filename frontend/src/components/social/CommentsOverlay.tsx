import { useState, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    TextField,
    Button,
    Avatar,
    CircularProgress,
    alpha,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Close as CloseIcon, Send as SendIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import socialService, { type LinkComment, type LinkPost } from '@/services/socialService';

interface CommentsOverlayProps {
    open: boolean;
    onClose: () => void;
    link: LinkPost;
    encryptComment: (text: string) => Promise<string>;
    decryptComment: (encryptedText: string) => Promise<string>;
    currentUserId?: string;
}

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
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch and decrypt comments
    const loadComments = useCallback(async () => {
        if (!open) return;

        setIsLoading(true);
        try {
            const rawComments = await socialService.getComments(link._id);

            // Decrypt all comments
            const decryptedComments = await Promise.all(
                rawComments.map(async (comment) => {
                    let decryptedContent = '[Decryption failed]';
                    try {
                        decryptedContent = await decryptComment(comment.encryptedContent);
                    } catch {
                        // Keep fallback
                    }
                    return { ...comment, decryptedContent };
                })
            );

            setComments(decryptedComments);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setIsLoading(false);
        }
    }, [open, link._id, decryptComment]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const handlePost = async () => {
        if (!newComment.trim() || isPosting) return;

        setIsPosting(true);
        try {
            const encryptedContent = await encryptComment(newComment.trim());
            const comment = await socialService.postComment(link._id, encryptedContent);

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

    return createPortal(
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
                        zIndex: 9999,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: isMobile ? 0 : 4,
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
                            maxWidth: isMobile ? '100%' : 500,
                            height: isMobile ? '100%' : 'auto',
                            maxHeight: isMobile ? '100%' : '80vh',
                            overflow: 'hidden',
                            borderRadius: isMobile ? 0 : '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: alpha(theme.palette.background.paper, 0.95),
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
                            <IconButton onClick={onClose} sx={{ ml: 1 }}>
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
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : comments.length === 0 ? (
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
                                        borderRadius: '16px',
                                    },
                                }}
                            />
                            <Button
                                variant="contained"
                                onClick={handlePost}
                                disabled={!newComment.trim() || isPosting}
                                sx={{
                                    borderRadius: '16px',
                                    minWidth: 48,
                                    px: 2,
                                }}
                            >
                                {isPosting ? <CircularProgress size={20} /> : <SendIcon />}
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            )}
        </AnimatePresence>,
        document.body
    );
});

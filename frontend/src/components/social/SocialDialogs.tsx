import { useState, useEffect, memo } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    TextField,
    Button,
    alpha,
    useTheme,
    CircularProgress,
    useMediaQuery,
    InputAdornment,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    Link as LinkIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import type { CreateRoomDialogProps, CreateCollectionDialogProps, PostLinkDialogProps } from './types';
import { DialogPortal } from './DialogPortal';
import {
    SOCIAL_DIALOG_Z_INDEX,
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_SMALL
} from './constants';

// Create Room Dialog
export const CreateRoomDialog = memo(({
    open,
    onClose,
    onSubmit,
    isLoading,
}: CreateRoomDialogProps) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim(), description.trim());
        }
    };

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
                            bgcolor: 'rgba(0,0,0,0.8)',
                            backdropFilter: isMobile ? 'none' : 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            variant={isMobile ? "solid" : "glass"}
                            component={motion.div}
                            initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            transition={isMobile ? { type: 'spring', damping: 25, stiffness: 300 } : {}}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                width: '100%',
                                maxWidth: isMobile ? '100%' : 450,
                                height: isMobile ? '100%' : 'auto',
                                maxHeight: isMobile ? '100%' : '90vh',
                                overflow: 'hidden',
                                borderRadius: isMobile ? 0 : SOCIAL_RADIUS_XLARGE,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: isMobile ? theme.palette.background.paper : alpha(theme.palette.background.paper, 0.95),
                            }}
                        >
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Create New Room</Typography>
                                <IconButton onClick={onClose} aria-label="Close">
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                                <TextField
                                    fullWidth
                                    label="Room Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    sx={{ mb: 2 }}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                />

                                <TextField
                                    fullWidth
                                    label="Description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    multiline
                                    rows={2}
                                    sx={{ mb: 1 }}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                                />
                            </Box>

                            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={!name.trim() || isLoading}
                                    sx={{ borderRadius: SOCIAL_RADIUS_SMALL, px: 4 }}
                                >
                                    {isLoading ? <CircularProgress size={20} /> : 'Create'}
                                </Button>
                            </Box>
                        </Paper>
                    </Box >
                )}
            </AnimatePresence >
        </DialogPortal>
    );
});

// Create Collection Dialog
export const CreateCollectionDialog = memo(({
    open,
    onClose,
    onSubmit,
    isLoading,
}: CreateCollectionDialogProps) => {
    const [name, setName] = useState('');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim());
            setName('');
        }
    };

    useEffect(() => {
        if (!open) setName('');
    }, [open]);

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
                            bgcolor: 'rgba(0,0,0,0.8)',
                            backdropFilter: isMobile ? 'none' : 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            variant={isMobile ? "solid" : "glass"}
                            component={motion.div}
                            initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            transition={isMobile ? { type: 'spring', damping: 25, stiffness: 300 } : {}}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                width: '100%',
                                maxWidth: isMobile ? '100%' : 400,
                                height: isMobile ? '100%' : 'auto',
                                maxHeight: isMobile ? '100%' : '90vh',
                                overflow: 'hidden',
                                borderRadius: isMobile ? 0 : SOCIAL_RADIUS_XLARGE,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: isMobile ? theme.palette.background.paper : alpha(theme.palette.background.paper, 0.95),
                            }}
                        >
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>New Collection</Typography>
                                <IconButton onClick={onClose} aria-label="Close">
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            <Box sx={{ p: 3, flex: 1 }}>
                                <TextField
                                    fullWidth
                                    label="Collection Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    sx={{ mb: 1 }}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                />
                            </Box>

                            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={!name.trim() || isLoading}
                                    sx={{ borderRadius: SOCIAL_RADIUS_SMALL, px: 4 }}
                                >
                                    {isLoading ? <CircularProgress size={20} /> : 'Create'}
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                )}
            </AnimatePresence>
        </DialogPortal>
    );
});

// Post Link Dialog
export const PostLinkDialog = memo(({
    open,
    onClose,
    onSubmit,
    isLoading,
    error
}: PostLinkDialogProps) => {
    const [url, setUrl] = useState('');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSubmit = () => {
        if (url.trim()) {
            onSubmit(url.trim());
            setUrl('');
        }
    };

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
                            bgcolor: 'rgba(0,0,0,0.8)',
                            backdropFilter: isMobile ? 'none' : 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            variant={isMobile ? "solid" : "glass"}
                            component={motion.div}
                            initial={isMobile ? { y: '100%' } : { scale: 0.8, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: '100%' } : { scale: 0.8, opacity: 0 }}
                            transition={isMobile ? { type: 'spring', damping: 30, stiffness: 350 } : {}}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                width: '100%',
                                maxWidth: isMobile ? '100%' : 450,
                                height: isMobile ? '100%' : 'auto',
                                maxHeight: isMobile ? '100%' : '90vh',
                                overflow: 'hidden',
                                borderRadius: isMobile ? 0 : SOCIAL_RADIUS_XLARGE,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: isMobile ? theme.palette.background.paper : alpha(theme.palette.background.paper, 0.95),
                            }}
                        >
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Post a Link</Typography>
                                <IconButton onClick={onClose} aria-label="Close">
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            <Box sx={{ p: 3, flex: 1 }}>
                                <TextField
                                    fullWidth
                                    label="URL"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    sx={{ mb: 1 }}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LinkIcon color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                {error && (
                                    <Alert
                                        severity="error"
                                        sx={{
                                            mt: 2,
                                            borderRadius: SOCIAL_RADIUS_SMALL,
                                            animation: 'fadeIn 0.3s ease-in'
                                        }}
                                    >
                                        {error}
                                    </Alert>
                                )}
                            </Box>

                            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={!url.trim() || isLoading}
                                    sx={{ borderRadius: SOCIAL_RADIUS_SMALL, px: 4 }}
                                >
                                    {isLoading ? <CircularProgress size={20} /> : 'Post'}
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                )}
            </AnimatePresence>
        </DialogPortal>
    );
});

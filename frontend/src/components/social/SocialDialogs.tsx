import { useState, memo } from 'react';
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

import type {
    CreateRoomDialogProps,
    CreateCollectionDialogProps,
    RenameCollectionDialogProps,
    PostLinkDialogProps,
    MoveLinkDialogProps,
    DeleteRoomDialogProps
} from './types';
import { useDecryptedCollectionMetadata, useDecryptedRoomMetadata } from '@/hooks/useDecryptedMetadata';
import type { Collection } from '@/services/socialService';
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
            setName('');
        }
    };

    const handleOnClose = () => {
        setName('');
        onClose();
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
                        onClick={handleOnClose}
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: SOCIAL_DIALOG_Z_INDEX,
                            bgcolor: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            elevation={0}
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
                                bgcolor: theme.palette.background.paper,
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

    const handleOnClose = () => {
        setName('');
        onClose();
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
                            bgcolor: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            elevation={0}
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
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>New Collection</Typography>
                                <IconButton onClick={handleOnClose} aria-label="Close">
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
                                <Button onClick={handleOnClose} disabled={isLoading}>Cancel</Button>
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

// Rename Collection Dialog
export const RenameCollectionDialog = memo(({
    open,
    collection,
    onClose,
    onSubmit,
    isLoading,
}: RenameCollectionDialogProps) => {
    const { name: initialName, isDecrypting } = useDecryptedCollectionMetadata(collection);
    const [name, setName] = useState('');
    const [prevInitialName, setPrevInitialName] = useState<string | null>(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Sync name when initialName changes or dialog opens
    if (open && initialName !== prevInitialName) {
        setPrevInitialName(initialName);
        setName(initialName || '');
    }

    // Reset prevInitialName when dialog closes
    if (!open && prevInitialName !== null) {
        setPrevInitialName(null);
    }

    const handleSubmit = () => {
        if (name.trim() && name.trim() !== initialName) {
            onSubmit(name.trim());
        } else if (name.trim() === initialName) {
            onClose();
        }
    };

    const handleOnClose = () => {
        setName('');
        onClose();
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
                        onClick={handleOnClose}
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: SOCIAL_DIALOG_Z_INDEX,
                            bgcolor: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            elevation={0}
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
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Rename Collection</Typography>
                                <IconButton onClick={handleOnClose} aria-label="Close">
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
                                    disabled={isDecrypting}
                                    placeholder={isDecrypting ? 'Decrypting...' : ''}
                                />
                            </Box>

                            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button onClick={handleOnClose} disabled={isLoading}>Cancel</Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSubmit}
                                    disabled={!name.trim() || isLoading || isDecrypting || name.trim() === initialName}
                                    sx={{ borderRadius: SOCIAL_RADIUS_SMALL, px: 4 }}
                                >
                                    {isLoading ? <CircularProgress size={20} /> : 'Save'}
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
                            bgcolor: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            elevation={0}
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
                                bgcolor: theme.palette.background.paper,
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
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LinkIcon color="action" />
                                                </InputAdornment>
                                            ),
                                        }
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
// Move Link Dialog
export const MoveLinkDialog = memo(({
    open,
    onClose,
    onSubmit,
    collections,
    currentCollectionId,
    isLoading
}: MoveLinkDialogProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
                            bgcolor: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 2,
                        }}
                    >
                        <Paper
                            elevation={0}
                            component={motion.div}
                            initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                width: '100%',
                                maxWidth: isMobile ? '100%' : 400,
                                height: isMobile ? '100%' : 'auto',
                                maxHeight: isMobile ? '100%' : '80vh',
                                overflow: 'hidden',
                                borderRadius: isMobile ? 0 : SOCIAL_RADIUS_XLARGE,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Move to Collection</Typography>
                                <IconButton onClick={onClose} aria-label="Close">
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            <Box sx={{ p: 1, flex: 1, overflowY: 'auto' }}>
                                {collections.map((collection) => (
                                    <CollectionOption
                                        key={collection._id}
                                        collection={collection}
                                        isActive={collection._id === currentCollectionId}
                                        onClick={() => onSubmit(collection._id)}
                                    />
                                ))}
                            </Box>

                            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                            </Box>
                        </Paper>
                    </Box>
                )}
            </AnimatePresence>
        </DialogPortal>
    );
});

// Helper component for MoveLinkDialog options
const CollectionOption = ({ collection, isActive, onClick }: { collection: Collection, isActive: boolean, onClick: () => void }) => {
    const theme = useTheme();
    const { name: decryptedName, isDecrypting } = useDecryptedCollectionMetadata(collection);

    return (
        <Button
            fullWidth
            onClick={onClick}
            disabled={isActive}
            sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                p: 2,
                borderRadius: SOCIAL_RADIUS_SMALL,
                mb: 0.5,
                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                color: isActive ? 'primary.main' : 'text.primary',
                '&:hover': {
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
                },
                textTransform: 'none',
            }}
        >
            <Typography variant="body1" sx={{ fontWeight: isActive ? 600 : 400 }}>
                {isDecrypting ? '...' : (decryptedName || 'Untitled Collection')}
            </Typography>
            {isActive && (
                <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.6 }}>
                    Current
                </Typography>
            )}
        </Button>
    );
};

// Delete Room Dialog - Requires typing name to confirm
export const DeleteRoomDialog = memo(({
    open,
    room,
    onClose,
    onConfirm,
    isLoading
}: DeleteRoomDialogProps) => {
    const { name: decryptedName } = useDecryptedRoomMetadata(room);
    const [confirmName, setConfirmName] = useState('');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleOnClose = () => {
        setConfirmName('');
        onClose();
    };

    const isConfirmed = confirmName.trim() === decryptedName;

    return (
        <DialogPortal>
            <AnimatePresence>
                {open && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleOnClose}
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: SOCIAL_DIALOG_Z_INDEX,
                            bgcolor: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: isMobile ? 0 : 4,
                        }}
                    >
                        <Paper
                            elevation={0}
                            component={motion.div}
                            initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                width: '100%',
                                maxWidth: isMobile ? '100%' : 450,
                                height: isMobile ? '100%' : 'auto',
                                maxHeight: isMobile ? '100%' : '90vh',
                                borderRadius: isMobile ? 0 : SOCIAL_RADIUS_XLARGE,
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: theme.palette.background.paper,
                                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                            }}
                        >
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>Delete Room</Typography>
                                <IconButton onClick={handleOnClose} aria-label="Close">
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            <Box sx={{ p: 3, flex: 1 }}>
                                <Alert severity="error" sx={{ mb: 3, borderRadius: SOCIAL_RADIUS_SMALL }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        WARNING: This action is permanent!
                                    </Typography>
                                    <Typography variant="body2">
                                        All collections, links, comments, and annotations in this room will be deleted forever.
                                    </Typography>
                                </Alert>

                                <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                                    Please type the room name <strong>{decryptedName}</strong> to confirm:
                                </Typography>

                                <TextField
                                    fullWidth
                                    placeholder={decryptedName || 'Decrypted room name'}
                                    value={confirmName}
                                    onChange={(e) => setConfirmName(e.target.value)}
                                    autoFocus
                                    autoComplete="off"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: SOCIAL_RADIUS_SMALL,
                                        }
                                    }}
                                />
                            </Box>

                            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button onClick={handleOnClose} disabled={isLoading}>Cancel</Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={onConfirm}
                                    disabled={!isConfirmed || isLoading}
                                    sx={{ borderRadius: SOCIAL_RADIUS_SMALL, px: 4 }}
                                >
                                    {isLoading ? <CircularProgress size={20} /> : 'Delete Permanently'}
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                )}
            </AnimatePresence>
        </DialogPortal>
    );
});

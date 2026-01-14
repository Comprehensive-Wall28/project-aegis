import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Avatar,
    TextField,
    Button,
    alpha,
    useTheme,
    CircularProgress,
    Snackbar,
    Alert,
    Tooltip,
    InputAdornment,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Link as LinkIcon,
    ContentCopy as CopyIcon,
    Group as GroupIcon,
    Folder as CollectionIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '@/stores/useSocialStore';
import { useSessionStore } from '@/stores/sessionStore';
import { LinkCard } from '@/components/social/LinkCard';
import type { Room } from '@/services/socialService';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
};

// Create Room Dialog (inline for simplicity)
function CreateRoomDialog({
    open,
    onClose,
    onSubmit,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string) => void;
    isLoading: boolean;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim(), description.trim());
        }
    };

    if (!open) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 1300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <Paper
                variant="glass"
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: '20px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Create New Room
                </Typography>

                <TextField
                    fullWidth
                    label="Room Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ mb: 2 }}
                    autoFocus
                />

                <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={2}
                    sx={{ mb: 3 }}
                />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!name.trim() || isLoading}
                    >
                        {isLoading ? <CircularProgress size={20} /> : 'Create'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export function SocialPage() {
    const theme = useTheme();
    const { roomId } = useParams<{ roomId?: string }>();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    // Store state
    const rooms = useSocialStore((state) => state.rooms);
    const currentRoom = useSocialStore((state) => state.currentRoom);
    const collections = useSocialStore((state) => state.collections);
    const currentCollectionId = useSocialStore((state) => state.currentCollectionId);
    const links = useSocialStore((state) => state.links);
    const isLoadingContent = useSocialStore((state) => state.isLoadingContent);

    // Actions
    const fetchRooms = useSocialStore((state) => state.fetchRooms);
    const selectRoom = useSocialStore((state) => state.selectRoom);
    const selectCollection = useSocialStore((state) => state.selectCollection);
    const createRoom = useSocialStore((state) => state.createRoom);
    const postLink = useSocialStore((state) => state.postLink);
    const createInvite = useSocialStore((state) => state.createInvite);
    const decryptRoomMetadata = useSocialStore((state) => state.decryptRoomMetadata);

    // Local state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [isPostingLink, setIsPostingLink] = useState(false);
    const [decryptedNames, setDecryptedNames] = useState<Map<string, string>>(new Map());
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Fetch rooms on mount
    useEffect(() => {
        if (pqcEngineStatus === 'operational') {
            fetchRooms();
        }
    }, [pqcEngineStatus, fetchRooms]);

    // Load room if roomId in URL
    useEffect(() => {
        if (roomId && pqcEngineStatus === 'operational') {
            selectRoom(roomId);
        }
    }, [roomId, pqcEngineStatus, selectRoom]);

    // Decrypt room names when rooms change
    useEffect(() => {
        const decryptNames = async () => {
            const newDecryptedNames = new Map<string, string>();
            for (const room of rooms) {
                try {
                    const { name } = await decryptRoomMetadata(room);
                    newDecryptedNames.set(room._id, name);
                } catch {
                    newDecryptedNames.set(room._id, room.name.substring(0, 2));
                }
            }
            setDecryptedNames(newDecryptedNames);
        };

        if (rooms.length > 0) {
            decryptNames();
        }
    }, [rooms, decryptRoomMetadata]);

    const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCreateRoom = async (name: string, description: string) => {
        try {
            setIsCreating(true);
            const room = await createRoom(name, description);
            setShowCreateDialog(false);
            showSnackbar('Room created with end-to-end encryption', 'success');
            // Navigate to new room
            selectRoom(room._id);
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to create room', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handlePostLink = async () => {
        if (!newLinkUrl.trim()) return;

        try {
            setIsPostingLink(true);
            await postLink(newLinkUrl.trim());
            setNewLinkUrl('');
            showSnackbar('Link shared successfully', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to post link', 'error');
        } finally {
            setIsPostingLink(false);
        }
    };

    const handleCopyInvite = async () => {
        if (!currentRoom) return;

        try {
            const inviteUrl = await createInvite(currentRoom._id);
            await navigator.clipboard.writeText(inviteUrl);
            showSnackbar('Invite link copied to clipboard', 'success');
        } catch (error: any) {
            showSnackbar(error.message || 'Failed to create invite', 'error');
        }
    };

    const getFilteredLinks = useCallback(() => {
        if (!currentCollectionId) return links;
        return links.filter((link) => link.collectionId === currentCollectionId);
    }, [links, currentCollectionId]);

    const getRoomInitials = (room: Room): string => {
        const name = decryptedNames.get(room._id) || '??';
        return name.substring(0, 2).toUpperCase();
    };

    // Loading state
    if (pqcEngineStatus !== 'operational') {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 400,
                    gap: 2,
                }}
            >
                <CircularProgress />
                <Typography color="text.secondary">Initializing PQC Engine...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100%', gap: 2, overflow: 'hidden' }}>
            {/* Left Sidebar - Room Icons */}
            <Paper
                variant="glass"
                sx={{
                    width: 72,
                    flexShrink: 0,
                    borderRadius: '16px',
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                    overflowY: 'auto',
                }}
            >
                {rooms.map((room) => (
                    <Tooltip key={room._id} title={decryptedNames.get(room._id) || 'Room'} placement="right">
                        <Avatar
                            component={motion.div}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            sx={{
                                width: 48,
                                height: 48,
                                bgcolor:
                                    currentRoom?._id === room._id
                                        ? 'primary.main'
                                        : alpha(theme.palette.primary.main, 0.2),
                                color:
                                    currentRoom?._id === room._id
                                        ? 'primary.contrastText'
                                        : 'primary.main',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '1rem',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={() => selectRoom(room._id)}
                        >
                            {getRoomInitials(room)}
                        </Avatar>
                    </Tooltip>
                ))}

                <Divider sx={{ width: '100%', my: 1 }} />

                {/* Create Room Button */}
                <Tooltip title="Create Room" placement="right">
                    <IconButton
                        onClick={() => setShowCreateDialog(true)}
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: alpha(theme.palette.success.main, 0.15),
                            color: 'success.main',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.success.main, 0.25),
                            },
                        }}
                    >
                        <AddIcon />
                    </IconButton>
                </Tooltip>
            </Paper>

            {/* Inner Sidebar - Collections */}
            {currentRoom && (
                <Paper
                    variant="glass"
                    sx={{
                        width: 200,
                        flexShrink: 0,
                        borderRadius: '16px',
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                    }}
                >
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Collections
                    </Typography>

                    <AnimatePresence mode="wait">
                        {collections.map((collection) => (
                            <Box
                                key={collection._id}
                                component={motion.div}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                whileHover={{ x: 4 }}
                                onClick={() => selectCollection(collection._id)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    bgcolor:
                                        currentCollectionId === collection._id
                                            ? alpha(theme.palette.primary.main, 0.15)
                                            : 'transparent',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    },
                                }}
                            >
                                <CollectionIcon
                                    sx={{
                                        fontSize: 18,
                                        color:
                                            currentCollectionId === collection._id
                                                ? 'primary.main'
                                                : 'text.secondary',
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: currentCollectionId === collection._id ? 600 : 400,
                                        color:
                                            currentCollectionId === collection._id
                                                ? 'primary.main'
                                                : 'text.primary',
                                    }}
                                >
                                    {collection.type === 'links' ? 'Links' : collection.name || 'Collection'}
                                </Typography>
                            </Box>
                        ))}
                    </AnimatePresence>
                </Paper>
            )}

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, overflow: 'hidden' }}>
                {currentRoom ? (
                    <>
                        {/* Room Header */}
                        <Paper
                            variant="glass"
                            sx={{
                                p: 2,
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexShrink: 0,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <GroupIcon sx={{ color: 'primary.main' }} />
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {decryptedNames.get(currentRoom._id) || 'Loading...'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {currentRoom.memberCount || 1} member{(currentRoom.memberCount || 1) > 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                            </Box>

                            <Button
                                variant="outlined"
                                startIcon={<CopyIcon />}
                                onClick={handleCopyInvite}
                                sx={{ borderRadius: '10px' }}
                            >
                                Invite
                            </Button>
                        </Paper>

                        {/* Post Link Input */}
                        <Paper
                            variant="glass"
                            sx={{
                                p: 2,
                                borderRadius: '16px',
                                flexShrink: 0,
                            }}
                        >
                            <TextField
                                fullWidth
                                placeholder="Paste a link to share..."
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostLink()}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LinkIcon color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handlePostLink}
                                                disabled={!newLinkUrl.trim() || isPostingLink}
                                                sx={{ borderRadius: '8px' }}
                                            >
                                                {isPostingLink ? <CircularProgress size={18} /> : 'Post'}
                                            </Button>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                    },
                                }}
                            />
                        </Paper>

                        {/* Links Grid */}
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            sx={{
                                flex: 1,
                                overflowY: 'auto',
                                pr: 1,
                            }}
                        >
                            {isLoadingContent ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 200,
                                    }}
                                >
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                            gap: 2,
                                        }}
                                    >
                                        {getFilteredLinks().map((link, index) => (
                                            <motion.div
                                                key={link._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <LinkCard link={link} />
                                            </motion.div>
                                        ))}
                                    </Box>
                                </AnimatePresence>
                            )}

                            {!isLoadingContent && getFilteredLinks().length === 0 && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 300,
                                        gap: 2,
                                    }}
                                >
                                    <LinkIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
                                    <Typography color="text.secondary">
                                        No links shared yet. Be the first!
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </>
                ) : (
                    // No room selected
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                        }}
                    >
                        <Paper
                            variant="glass"
                            sx={{
                                p: 6,
                                borderRadius: '24px',
                                textAlign: 'center',
                                maxWidth: 400,
                            }}
                        >
                            <GroupIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                Social Link Sharing
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                Create a room to share links with your team using end-to-end encryption.
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setShowCreateDialog(true)}
                                sx={{ borderRadius: '12px' }}
                            >
                                Create Your First Room
                            </Button>
                        </Paper>
                    </Box>
                )}
            </Box>

            {/* Create Room Dialog */}
            <CreateRoomDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onSubmit={handleCreateRoom}
                isLoading={isCreating}
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ borderRadius: '12px' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Button,
    CircularProgress,
    alpha,
    useTheme,
    Alert,
} from '@mui/material';
import {
    Group as GroupIcon,
    Lock as LockIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import socialService from '@/services/socialService';
import { useSocialStore, importRoomKeyFromBase64 } from '@/stores/useSocialStore';
import { useSessionStore } from '@/stores/sessionStore';

// Decrypt room info with key from URL hash
const decryptWithKey = async (key: CryptoKey, encryptedData: string): Promise<string> => {
    try {
        const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        return '[Unable to decrypt]';
    }
};

export function InviteLanding() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { code } = useParams<{ code: string }>();

    const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    const joinRoom = useSocialStore((state) => state.joinRoom);

    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roomInfo, setRoomInfo] = useState<{ name: string; description: string } | null>(null);
    const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);

    // Parse invite on mount
    useEffect(() => {
        const loadInvite = async () => {
            if (!code) {
                setError('Invalid invite link');
                setIsLoading(false);
                return;
            }

            try {
                // Get key from URL hash
                const hash = window.location.hash.slice(1); // Remove '#'
                if (!hash) {
                    setError('Missing encryption key in invite link');
                    setIsLoading(false);
                    return;
                }

                // Import room key from base64
                const key = await importRoomKeyFromBase64(hash);
                setRoomKey(key);

                // Fetch encrypted room info
                const encryptedInfo = await socialService.getInviteInfo(code);

                // Decrypt room name and description
                const name = await decryptWithKey(key, encryptedInfo.name);
                const description = await decryptWithKey(key, encryptedInfo.description);

                setRoomInfo({ name, description });
                setIsLoading(false);
            } catch (err: any) {
                console.error('Failed to load invite:', err);
                setError(err.response?.data?.message || 'Invite not found or expired');
                setIsLoading(false);
            }
        };

        loadInvite();
    }, [code]);

    const handleJoin = async () => {
        if (!code || !roomKey) return;

        // If not authenticated, redirect to login with pending invite
        if (!isAuthenticated || pqcEngineStatus !== 'operational') {
            // Store pending invite in session storage for after login
            sessionStorage.setItem(
                'pendingInvite',
                JSON.stringify({
                    inviteCode: code,
                    keyBase64: window.location.hash.slice(1),
                })
            );
            navigate('/', { state: { showLogin: true } });
            return;
        }

        try {
            setIsJoining(true);
            await joinRoom(code, roomKey);
            navigate('/dashboard/social');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to join room');
            setIsJoining(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(
                    theme.palette.primary.main,
                    0.05
                )} 100%)`,
                p: 3,
            }}
        >
            <Paper
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                variant="glass"
                sx={{
                    p: 5,
                    borderRadius: '24px',
                    textAlign: 'center',
                    maxWidth: 440,
                    width: '100%',
                }}
            >
                {isLoading ? (
                    <Box sx={{ py: 4 }}>
                        <CircularProgress size={48} />
                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                            Decrypting invite...
                        </Typography>
                    </Box>
                ) : error ? (
                    <Box sx={{ py: 2 }}>
                        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                            {error}
                        </Alert>
                        <Button variant="contained" onClick={() => navigate('/')}>
                            Go Home
                        </Button>
                    </Box>
                ) : roomInfo ? (
                    <>
                        {/* Icon */}
                        <Box
                            component={motion.div}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                            }}
                        >
                            <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                        </Box>

                        {/* Title */}
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                            You're Invited!
                        </Typography>

                        {/* Room Name */}
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                color: 'primary.main',
                                mb: 1,
                            }}
                        >
                            {roomInfo.name}
                        </Typography>

                        {/* Description */}
                        {roomInfo.description && (
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                {roomInfo.description}
                            </Typography>
                        )}

                        {/* Security badge */}
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 2,
                                py: 1,
                                borderRadius: '12px',
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                mb: 4,
                            }}
                        >
                            <LockIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 500 }}>
                                End-to-End Encrypted
                            </Typography>
                        </Box>

                        {/* Join Button */}
                        <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            onClick={handleJoin}
                            disabled={isJoining}
                            startIcon={isJoining ? <CircularProgress size={20} /> : <CheckIcon />}
                            sx={{
                                borderRadius: '14px',
                                py: 1.5,
                                fontWeight: 600,
                                fontSize: '1rem',
                            }}
                        >
                            {isJoining ? 'Joining...' : isAuthenticated ? 'Join Room' : 'Login to Join'}
                        </Button>

                        {!isAuthenticated && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                You'll be redirected to login first
                            </Typography>
                        )}
                    </>
                ) : null}
            </Paper>
        </Box>
    );
}

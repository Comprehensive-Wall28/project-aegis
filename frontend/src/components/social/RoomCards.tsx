import { memo } from 'react';
import { Box, Paper, Typography, Avatar, IconButton, alpha, useTheme, Skeleton } from '@mui/material';
import { Group as GroupIcon, Add as AddIcon, Lock as LockIcon } from '@mui/icons-material';
import type { Room } from '@/services/socialService';
import { useDecryptedRoomMetadata } from '@/hooks/useDecryptedMetadata';

// Room Card Component - Memoized for performance
export const RoomCard = memo(({
    room,
    onSelect,
}: {
    room: Room;
    onSelect: () => void;
}) => {
    const theme = useTheme();
    const { name, isDecrypting } = useDecryptedRoomMetadata(room);

    const displayName = name || '...';
    const isEncrypted = displayName === '[Encrypted]';

    return (
        <Paper
            variant="glass"
            onClick={onSelect}
            sx={{
                p: 3,
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: 140,
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                    sx={{
                        width: 48,
                        height: 48,
                        bgcolor: isEncrypted ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.primary.main, 0.2),
                        color: isEncrypted ? 'warning.main' : 'primary.main',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                    }}
                >
                    {isEncrypted ? <LockIcon fontSize="small" /> : displayName.substring(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: isEncrypted ? 'text.secondary' : 'text.primary',
                        }}
                    >
                        {isDecrypting ? <Skeleton width="60%" /> : displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {room.memberCount || 1} member{(room.memberCount || 1) > 1 ? 's' : ''}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
                <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                    Tap to enter
                </Typography>
            </Box>
        </Paper>
    );
});

// Create Room Card - Memoized for performance
export const CreateRoomCard = memo(({
    onClick,
}: {
    onClick: () => void;
}) => {
    const theme = useTheme();

    return (
        <Paper
            variant="glass"
            onClick={onClick}
            sx={{
                p: 3,
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                minHeight: 140,
                border: `2px dashed ${alpha(theme.palette.success.main, 0.4)}`,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                '&:hover': {
                    borderColor: theme.palette.success.main,
                },
            }}
        >
            <IconButton
                sx={{
                    width: 56,
                    height: 56,
                    bgcolor: alpha(theme.palette.success.main, 0.15),
                    color: 'success.main',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.25),
                    },
                }}
            >
                <AddIcon sx={{ fontSize: 28 }} />
            </IconButton>
            <Typography variant="body1" fontWeight={500} color="success.main">
                Create Room
            </Typography>
        </Paper>
    );
});

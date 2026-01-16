import { memo } from 'react';
import { Box, Paper, Typography, Avatar, IconButton, alpha, useTheme } from '@mui/material';
import { Group as GroupIcon, Add as AddIcon } from '@mui/icons-material';
import type { Room } from '@/services/socialService';

// Room Card Component - Memoized for performance
export const RoomCard = memo(({
    decryptedName,
    memberCount,
    onSelect,
}: {
    room: Room; // kept for compatibility if needed elsewhere
    decryptedName: string;
    memberCount: number;
    onSelect: () => void;
}) => {
    const theme = useTheme();

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
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                        color: 'primary.main',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                    }}
                >
                    {decryptedName.substring(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {decryptedName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {memberCount} member{memberCount > 1 ? 's' : ''}
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

import { memo, forwardRef } from 'react';
import { Box, Paper, Typography, Avatar, IconButton, alpha, useTheme, Skeleton, useMediaQuery } from '@mui/material';
import { Group as GroupIcon, Add as AddIcon, Lock as LockIcon, ExitToApp as LeaveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useDecryptedRoomMetadata } from '@/hooks/useDecryptedMetadata';
import { motion } from 'framer-motion';
import type { RoomCardProps, CreateRoomCardProps } from './types';
import { SOCIAL_RADIUS_LARGE } from './constants';

// Motion-enabled Paper for animations
const MotionPaper = motion.create(
    forwardRef<HTMLDivElement, React.ComponentProps<typeof Paper>>(function MotionPaperBase(props, ref) {
        return <Paper ref={ref} {...props} />;
    })
);

// Shared animation variants - matches Dashboard's slow, subtle fade-in
const createCardVariants = (index: number) => ({
    hidden: {
        opacity: 0,
        y: 10
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
            delay: index * 0.05
        }
    }
} as const);

// Room Card Component - Memoized for performance with desktop animations
export const RoomCard = memo(({
    room,
    onSelect,
    onLeave,
    onDelete,
    index = 0,
}: RoomCardProps) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
    const { name, isDecrypting } = useDecryptedRoomMetadata(room);

    // Show skeleton while decrypting, avoid showing [Encrypted] during initial load
    const isLoading = isDecrypting || !name;
    const displayName = name || '';
    const isEncrypted = displayName === '[Encrypted]';

    const cardVariants = createCardVariants(index);

    return (
        <MotionPaper
            elevation={2}
            onClick={onSelect}
            role="button"
            aria-label={`Enter room: ${displayName || 'Loading...'}`}
            initial={isDesktop ? 'hidden' : false}
            animate={isDesktop ? 'visible' : undefined}
            variants={isDesktop ? cardVariants : undefined}
            sx={{
                p: 3,
                borderRadius: SOCIAL_RADIUS_LARGE,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: 140,
                border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
                    duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.4),
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                    boxShadow: `0 4px 12px -2px ${alpha(theme.palette.common.black, 0.1)}`,
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                    sx={{
                        width: 48,
                        height: 48,
                        bgcolor: isLoading
                            ? alpha(theme.palette.action.hover, 0.1)
                            : isEncrypted
                                ? alpha(theme.palette.warning.main, 0.1)
                                : alpha(theme.palette.primary.main, 0.2),
                        color: isEncrypted ? 'warning.main' : 'primary.main',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        transition: 'background-color 0.3s ease',
                    }}
                >
                    {isLoading ? (
                        <Skeleton variant="circular" width={24} height={24} />
                    ) : isEncrypted ? (
                        <LockIcon fontSize="small" />
                    ) : (
                        displayName.substring(0, 2).toUpperCase()
                    )}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
                        {isLoading ? (
                            <Skeleton width="70%" animation="wave" />
                        ) : (
                            displayName
                        )}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                        Tap to enter
                    </Typography>
                </Box>

                {!isLoading && (
                    <Box sx={{ display: 'flex', mr: -0.5 }}>
                        {room.role === 'owner' ? (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(e);
                                }}
                                sx={{
                                    color: 'text.secondary',
                                    borderRadius: '12px',
                                    px: 1.5,
                                    py: 0.5,
                                    gap: 0.5,
                                    transition: theme.transitions.create(['background-color', 'color']),
                                    '&:hover': {
                                        color: 'error.main',
                                        bgcolor: alpha(theme.palette.error.main, 0.08),
                                    },
                                }}
                                aria-label="Delete room"
                                title="Delete room"
                            >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>Delete</Typography>
                            </IconButton>
                        ) : (
                            onLeave && (
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLeave(e);
                                    }}
                                    sx={{
                                        color: 'text.secondary',
                                        borderRadius: '12px',
                                        px: 1.5,
                                        py: 0.5,
                                        gap: 0.5,
                                        transition: theme.transitions.create(['background-color', 'color']),
                                        '&:hover': {
                                            color: 'error.main',
                                            bgcolor: alpha(theme.palette.error.main, 0.08),
                                        },
                                    }}
                                    aria-label="Leave room"
                                    title="Leave room"
                                >
                                    <LeaveIcon sx={{ fontSize: 18 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Leave</Typography>
                                </IconButton>
                            )
                        )}
                    </Box>
                )}
            </Box>
        </MotionPaper>
    );
});

// Create Room Card - Memoized for performance with desktop animations
export const CreateRoomCard = memo(({
    onClick,
    index = 0,
}: CreateRoomCardProps) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const cardVariants = createCardVariants(index);

    return (
        <MotionPaper
            elevation={2}
            onClick={onClick}
            role="button"
            aria-label="Create new room"
            initial={isDesktop ? 'hidden' : false}
            animate={isDesktop ? 'visible' : undefined}
            variants={isDesktop ? cardVariants : undefined}
            whileTap={isDesktop ? { scale: 0.98 } : undefined}
            sx={{
                p: 3,
                borderRadius: SOCIAL_RADIUS_LARGE,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                minHeight: 140,
                border: `2px dashed ${alpha(theme.palette.success.main, 0.6)}`,
                bgcolor: theme.palette.background.paper,
                transition: 'border-color 0.2s ease',
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
                    transition: 'transform 0.2s ease, background-color 0.2s ease',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.25),
                    },
                }}
                aria-label="Create room"
            >
                <AddIcon sx={{ fontSize: 28 }} />
            </IconButton>
            <Typography variant="body1" fontWeight={500} color="success.main">
                Create Room
            </Typography>
        </MotionPaper>
    );
});

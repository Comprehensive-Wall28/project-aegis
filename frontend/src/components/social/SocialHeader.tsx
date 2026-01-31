import { memo, useCallback, type ChangeEvent } from 'react';
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
    Tooltip,
    InputAdornment,
    Skeleton,
} from '@mui/material';
import {
    Group as GroupIcon,
    Link as LinkIcon,
    ContentCopy as CopyIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon,
    FitScreen as ZenModeIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDecryptedRoomMetadata } from '@/hooks/useDecryptedMetadata';
import type { SocialHeaderProps } from './types';
import { SocialFilterMenu } from './SocialFilterMenu';
import {
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_MEDIUM,
    SOCIAL_URL_REGEX,
} from './constants';

export const SocialHeader = memo(({
    viewMode,
    isMobile,
    optimisticRoomId,
    currentRoom,
    handleExitRoom,
    searchQuery,
    setSearchQuery,
    handleFilterClick,
    selectedUploader,
    handleCopyInvite,
    filterAnchorEl,
    handleFilterClose,
    handleSelectUploader,
    viewFilter,
    handleViewFilterChange,
    uniqueUploaders,
    handlePostLink,
    isPostingLink,
    sortOrder,
    handleSortOrderChange,
    isSearchingLinks,
    isZenModeOpen,
    onToggleZenMode,
    onCreateRoom,
}: SocialHeaderProps) => {
    const theme = useTheme();
    const { name: decryptedName, isDecrypting } = useDecryptedRoomMetadata(currentRoom);
    const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), [setSearchQuery]);
    const handleClearSearch = useCallback(() => setSearchQuery(''), [setSearchQuery]);

    const handlePostKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && /^(https?:\/\/|www\.)\S+/i.test(searchQuery)) {
            handlePostLink(searchQuery);
        }
    }, [handlePostLink, searchQuery]);

    const isUrl = SOCIAL_URL_REGEX.test(searchQuery);

    const showSkeleton = isDecrypting ||
        (viewMode === 'room-content' && !currentRoom) ||
        (optimisticRoomId && currentRoom?._id !== optimisticRoomId);

    return (
        <Paper
            elevation={1}
            sx={{
                p: isMobile ? '12px 16px' : 2, // Relaxed mobile padding
                borderRadius: SOCIAL_RADIUS_XLARGE,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                minHeight: isMobile ? 64 : 80, // Unified mobile height (64px)
                width: '100%',
                boxSizing: 'border-box',
                gap: isMobile ? 1.5 : 3,
            }}
        >
            {/* LEFT COLUMN: Navigation & Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                <AnimatePresence mode="wait">
                    {viewMode === 'room-content' ? (
                        <Box
                            key="room-header-title-area"
                            component={motion.div}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.2 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 1, minWidth: 0 }}
                        >
                            <IconButton
                                onClick={handleExitRoom}
                                edge="start"
                                sx={{
                                    mr: 0.5,
                                    width: isMobile ? 40 : 40,
                                    height: isMobile ? 40 : 40
                                }}
                                aria-label="Exit room"
                            >
                                <ArrowBackIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                            </IconButton>
                            <Box sx={{ minWidth: 0, flexShrink: 1, display: 'flex', alignItems: 'center' }}>
                                <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
                                    {showSkeleton
                                        ? <Skeleton width={120} />
                                        : (decryptedName || '...')}
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Box
                            key="social-rooms-title-area"
                            component={motion.div}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.2 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}
                        >
                            <Box sx={{ width: isMobile ? 40 : 40, height: isMobile ? 40 : 40, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: -0.5 }}>
                                <GroupIcon sx={{ color: 'primary.main', fontSize: isMobile ? 24 : 28 }} />
                            </Box>
                            <Box sx={{ flexShrink: 0 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
                                    Social Rooms
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </AnimatePresence>
            </Box>

            {/* CENTER COLUMN: Omni-Action Bar (Desktop Room View Only) */}
            {!isMobile && viewMode === 'room-content' && (optimisticRoomId || currentRoom) && (
                <Box
                    sx={{
                        flex: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minWidth: 0,
                        maxWidth: 800,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', maxWidth: 800 }}>
                        <TextField
                            placeholder="Paste a link to share or search for links..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handlePostKeyDown}
                            size="medium"
                            fullWidth
                            disabled={!currentRoom}
                            autoComplete="off"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: SOCIAL_RADIUS_MEDIUM,
                                    bgcolor: alpha(theme.palette.text.primary, 0.03),
                                    height: 44,
                                    fontSize: '1rem',
                                    border: `1px solid ${isUrl ? alpha(theme.palette.primary.main, 0.4) : alpha(theme.palette.divider, 0.15)}`,
                                    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow']),
                                    '& fieldset': { border: 'none' },
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.text.primary, 0.05),
                                        border: `1px solid ${isUrl ? alpha(theme.palette.primary.main, 0.6) : alpha(theme.palette.divider, 0.3)}`,
                                    },
                                    '&.Mui-focused': {
                                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                                        border: `1px solid ${theme.palette.primary.main}`,
                                    }
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.8 }}>
                                            <SearchIcon
                                                sx={{
                                                    fontSize: 22,
                                                    color: (searchQuery && !isUrl) ? 'primary.main' : 'text.secondary',
                                                    transition: 'color 0.2s'
                                                }}
                                            />
                                            <Box sx={{ width: '1px', height: 16, bgcolor: alpha(theme.palette.divider, 0.2), mx: 0.2 }} />
                                            <LinkIcon
                                                sx={{
                                                    fontSize: 22,
                                                    color: isUrl ? 'primary.main' : 'text.secondary',
                                                    transition: 'color 0.2s'
                                                }}
                                            />
                                        </Box>
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {isSearchingLinks && <CircularProgress size={18} sx={{ mr: 1, color: 'primary.main' }} />}
                                        <AnimatePresence mode="wait">
                                            {isUrl ? (
                                                <IconButton
                                                    key="share-btn"
                                                    component={motion.button}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    size="small"
                                                    onClick={() => handlePostLink(searchQuery)}
                                                    disabled={isPostingLink}
                                                    sx={{
                                                        color: 'primary.main',
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        mr: -0.5,
                                                        width: 32,
                                                        height: 32,
                                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                                    }}
                                                >
                                                    {isPostingLink ? <CircularProgress size={20} color="inherit" /> : <AddIcon sx={{ fontSize: 22 }} />}
                                                </IconButton>
                                            ) : searchQuery ? (
                                                <IconButton key="clear-btn" size="small" onClick={handleClearSearch} sx={{ color: 'text.secondary' }}>
                                                    <CloseIcon sx={{ fontSize: 20 }} />
                                                </IconButton>
                                            ) : null}
                                        </AnimatePresence>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                </Box>
            )}

            {/* RIGHT COLUMN: Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: isMobile ? 0.5 : 1, flex: 1 }}>
                <AnimatePresence mode="wait">
                    {viewMode === 'rooms' ? (
                        <Box
                            key="rooms-actions"
                            component={motion.div}
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 5, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.2 }}
                        >
                            {isMobile ? (
                                <IconButton
                                    onClick={onCreateRoom}
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                        width: 40,
                                        height: 40,
                                    }}
                                    aria-label="Create Room"
                                >
                                    <AddIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                            ) : (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={onCreateRoom}
                                    sx={{
                                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        height: 44,
                                        px: 3,
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    Create Room
                                </Button>
                            )}
                        </Box>
                    ) : (viewMode === 'room-content' && (optimisticRoomId || currentRoom)) ? (
                        <Box
                            key="room-actions-right"
                            component={motion.div}
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 5, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.2 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                            <Tooltip title="Filter Links">
                                <span>
                                    <IconButton
                                        onClick={handleFilterClick}
                                        disabled={!currentRoom}
                                        sx={{
                                            color: (selectedUploader || viewFilter !== 'all') ? 'primary.main' : 'text.secondary',
                                            bgcolor: (selectedUploader || viewFilter !== 'all') ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.text.primary, 0.03),
                                            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                                            borderRadius: SOCIAL_RADIUS_MEDIUM,
                                            width: isMobile ? 40 : 44,
                                            height: isMobile ? 40 : 44,
                                            transition: theme.transitions.create(['background-color', 'border-color', 'color']),
                                            '&:hover': {
                                                color: 'primary.main',
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                            }
                                        }}
                                        aria-label="Filter links"
                                    >
                                        <FilterListIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            <Tooltip title={isZenModeOpen ? "Exit Zen Mode (Ctrl+F)" : "Zen Mode (Ctrl+F)"}>
                                <span>
                                    <IconButton
                                        onClick={onToggleZenMode}
                                        disabled={!currentRoom}
                                        sx={{
                                            color: isZenModeOpen ? 'primary.main' : 'text.secondary',
                                            bgcolor: isZenModeOpen ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.text.primary, 0.03),
                                            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                                            borderRadius: SOCIAL_RADIUS_MEDIUM,
                                            width: isMobile ? 40 : 44,
                                            height: isMobile ? 40 : 44,
                                            transition: theme.transitions.create(['background-color', 'border-color', 'color']),
                                            '&:hover': {
                                                color: 'primary.main',
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                            }
                                        }}
                                        aria-label="Toggle Zen Mode"
                                    >
                                        <ZenModeIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            {!isMobile && (
                                <Button
                                    variant="outlined"
                                    startIcon={<CopyIcon sx={{ fontSize: 20 }} />}
                                    onClick={handleCopyInvite}
                                    disabled={!currentRoom}
                                    sx={{
                                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                                        height: 44,
                                        px: 3,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                                        bgcolor: alpha(theme.palette.text.primary, 0.03),
                                        color: 'text.secondary',
                                        transition: theme.transitions.create(['background-color', 'border-color', 'color']),
                                        '&:hover': {
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                                            color: 'primary.main',
                                        }
                                    }}
                                >
                                    Invite
                                </Button>
                            )}
                        </Box>
                    ) : null}
                </AnimatePresence>
            </Box>

            <SocialFilterMenu
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={handleFilterClose}
                sortOrder={sortOrder}
                onSortOrderChange={handleSortOrderChange}
                viewFilter={viewFilter}
                onViewFilterChange={handleViewFilterChange}
                selectedUploader={selectedUploader}
                onSelectUploader={handleSelectUploader}
                uniqueUploaders={uniqueUploaders}
            />
        </Paper >
    );
});
